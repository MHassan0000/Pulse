"use server";

import mongoose, { SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";

import Community from "../models/community.model";
import Thread from "../models/thread.model";
import User from "../models/user.model";

import { connectToDB } from "../mongoose";
import { ThreadMediaValidation } from "../validations/thread";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const resolveUploadThingAppId = () => {
  const publicAppId = process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID;
  if (typeof publicAppId === "string" && publicAppId.trim()) {
    return publicAppId.trim();
  }

  const rawToken = process.env.UPLOADTHING_TOKEN;
  if (typeof rawToken !== "string" || !rawToken.trim()) {
    return "";
  }

  const normalizedToken = rawToken.trim().replace(/^['"]|['"]$/g, "");

  try {
    const decoded = Buffer.from(normalizedToken, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as { appId?: unknown };
    return typeof parsed.appId === "string" ? parsed.appId : "";
  } catch {
    return "";
  }
};

const UPLOADTHING_APP_ID = resolveUploadThingAppId();

const toUploadThingCdnUrl = (providerKey: string, fallbackUrl: string) => {
  const normalizedKey = providerKey.trim();

  if (UPLOADTHING_APP_ID && normalizedKey) {
    return `https://${UPLOADTHING_APP_ID}.ufs.sh/f/${normalizedKey}`;
  }

  return fallbackUrl;
};

const sanitizeUsername = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);

const fallbackUsernameFromId = (userId: string) =>
  sanitizeUsername(`user-${userId}`) || `user-${Date.now()}`;

type EnsureUserFromClerkParams = {
  userId: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

export async function ensureUserFromClerk({
  userId,
  username,
  name,
  image,
}: EnsureUserFromClerkParams) {
  try {
    await connectToDB();

    const existingUser = await User.findOne({ id: userId });
    if (existingUser) return existingUser;

    const preferredUsername = sanitizeUsername(username ?? "");
    const fallbackUsername = fallbackUsernameFromId(userId);
    const resolvedUsername = preferredUsername || fallbackUsername;
    const resolvedName = (name ?? "").trim() || resolvedUsername;
    const resolvedImage = image ?? "";

    try {
      return await User.findOneAndUpdate(
        { id: userId },
        {
          $setOnInsert: {
            id: userId,
            username: resolvedUsername,
            name: resolvedName,
            image: resolvedImage,
            bio: "",
            onboarded: false,
            threads: [],
            communities: [],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      if (!message.includes("duplicate key") || resolvedUsername === fallbackUsername) {
        throw error;
      }

      return await User.findOneAndUpdate(
        { id: userId },
        {
          $setOnInsert: {
            id: userId,
            username: fallbackUsername,
            name: resolvedName,
            image: resolvedImage,
            bio: "",
            onboarded: false,
            threads: [],
            communities: [],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  } catch (error: unknown) {
    throw new Error(`Failed to ensure user: ${getErrorMessage(error)}`);
  }
};

type ActivityThread = {
  _id: unknown;
  threadId?: unknown;
  parentId?: unknown;
  createdAt?: unknown;
  likes?: unknown[];
  reposts?: unknown[];
  author?: {
    _id?: unknown;
    id?: string;
    name?: string;
    username?: string;
    image?: string;
  };
  community?: {
    id?: string;
    name?: string;
    image?: string;
  } | null;
  type?: "reply" | "nested_reply" | "community" | "like" | "repost";
};

type ActivityEvent = {
  _id: string;
  threadId: string;
  parentId: string | null;
  createdAt: string;
  type: "reply" | "nested_reply" | "community" | "like" | "repost";
  author: {
    id: string;
    name: string;
    username: string;
    image: string;
  };
  community: {
    id: string;
    name: string;
    image: string;
  } | null;
};

type ThreadView = {
  _id: unknown;
  text?: string;
  parentId?: string | null;
  author?: {
    id?: string;
    name?: string;
    image?: string;
  };
  community?: {
    id?: string;
    name?: string;
    image?: string;
  } | null;
  createdAt?: unknown;
  children?: unknown[];
  likes?: unknown[];
  reposts?: unknown[];
  media?: unknown[];
};

type ThreadMedia = {
  kind: "image" | "video";
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  providerKey: string;
};

type SerializedThread = {
  _id: string;
  text: string;
  parentId: string | null;
  author: {
    id: string;
    name: string;
    image: string;
  };
  community: {
    id: string;
    name: string;
    image: string;
  } | null;
  createdAt: string;
  children: Array<{ author: { image: string } }>;
  likes: string[];
  reposts: string[];
  media: ThreadMedia[];
};

const resolveUserQuery = (value: string) =>
  mongoose.Types.ObjectId.isValid(value)
    ? { $or: [{ id: value }, { _id: value }] }
    : { id: value };

const toIdString = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "toString" in value) {
    try {
      return String((value as { toString: () => string }).toString());
    } catch {
      return "";
    }
  }

  return "";
};

const toIsoDateString = (value: unknown) => {
  if (!value) return "";
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const normalizeMediaList = (media: unknown): ThreadMedia[] => {
  if (!Array.isArray(media)) return [];

  const parsedItems = media
    .map((item) => {
      const mediaItem = item as {
        kind?: unknown;
        url?: unknown;
        mimeType?: unknown;
        size?: unknown;
        width?: unknown;
        height?: unknown;
        durationSec?: unknown;
        providerKey?: unknown;
      };

      const kind =
        mediaItem.kind === "image" || mediaItem.kind === "video"
          ? mediaItem.kind
          : null;

      if (!kind) return null;

      return {
        kind,
        url: toUploadThingCdnUrl(
          typeof mediaItem.providerKey === "string" ? mediaItem.providerKey : "",
          typeof mediaItem.url === "string" ? mediaItem.url : ""
        ),
        mimeType:
          typeof mediaItem.mimeType === "string" ? mediaItem.mimeType : "",
        size:
          typeof mediaItem.size === "number"
            ? mediaItem.size
            : Number(mediaItem.size ?? 0),
        width: typeof mediaItem.width === "number" ? mediaItem.width : null,
        height: typeof mediaItem.height === "number" ? mediaItem.height : null,
        durationSec:
          typeof mediaItem.durationSec === "number"
            ? mediaItem.durationSec
            : null,
        providerKey:
          typeof mediaItem.providerKey === "string"
            ? mediaItem.providerKey.trim()
            : "",
      };
    })
    .filter(
      (item): item is {
        kind: "image" | "video";
        url: string;
        mimeType: string;
        size: number;
        width: number | null;
        height: number | null;
        durationSec: number | null;
        providerKey: string;
      } => Boolean(item)
    );

  const safe = ThreadMediaValidation.array().max(4).safeParse(parsedItems);
  return safe.success ? safe.data : [];
};

const serializeThread = (thread: ThreadView): SerializedThread => ({
  _id: toIdString(thread._id),
  text: typeof thread.text === "string" ? thread.text : "",
  parentId: toIdString(thread.parentId) || null,
  author: {
    id: thread.author?.id ?? "",
    name: thread.author?.name ?? "Unknown",
    image: thread.author?.image ?? "",
  },
  community: thread.community
    ? {
        id: thread.community.id ?? "",
        name: thread.community.name ?? "",
        image: thread.community.image ?? "",
      }
    : null,
  createdAt: toIsoDateString(thread.createdAt),
  children: Array.isArray(thread.children)
    ? thread.children.map((child) => {
        const childRecord = child as { author?: { image?: string } };
        return {
          author: {
            image: childRecord.author?.image ?? "",
          },
        };
      })
    : [],
  likes: Array.isArray(thread.likes)
    ? thread.likes.map((value) => String(value))
    : [],
  reposts: Array.isArray(thread.reposts)
    ? thread.reposts.map((value) => String(value))
    : [],
  media: normalizeMediaList(thread.media),
});


export async function fetchUser(userId: string) {
  try {
    await connectToDB();

    return await User.findOne(resolveUserQuery(userId))
      .select("id username name image bio onboarded")
      .lean();
  } catch (error: unknown) {
    throw new Error(`Failed to fetch user: ${getErrorMessage(error)}`);
  }
}

interface Params {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}

export async function updateUser({
  userId,
  bio,
  name,
  path,
  username,
  image,
}: Params): Promise<void> {
  try {
    await connectToDB();

    await User.findOneAndUpdate(
      { id: userId },
      {
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },
      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: unknown) {
    throw new Error(`Failed to create/update user: ${getErrorMessage(error)}`);
  }
}

export async function fetchUserPosts(
  userId: string,
  {
    pageNumber = 1,
    pageSize = 10,
    onlyWithMedia = false,
  }: {
    pageNumber?: number;
    pageSize?: number;
    onlyWithMedia?: boolean;
  } = {}
) {
  try {
    await connectToDB();

    const user = await User.findOne(resolveUserQuery(userId)).select("_id id name image");
    if (!user?._id) return null;

    const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
    const skipAmount = (normalizedPageNumber - 1) * normalizedPageSize;

    const query: {
      author: unknown;
      parentId: { $in: Array<null | undefined | ""> };
      media?: { $exists: true; $ne: [] };
    } = {
      author: user._id,
      parentId: { $in: [null, undefined, ""] },
    };

    if (onlyWithMedia) {
      query.media = { $exists: true, $ne: [] };
    }

    const totalCount = await Thread.countDocuments(query);

    const rawThreads = await Thread.find(query)
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(normalizedPageSize)
      .populate([
        {
          path: "community",
          model: Community,
          select: "name id image _id",
        },
        {
          path: "author",
          model: User,
          select: "name image id",
        },
        {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "name image id",
          },
        },
      ])
      .lean();

    const threads = (rawThreads as ThreadView[]).map(serializeThread);

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      threads,
      isNext: totalCount > skipAmount + threads.length,
      totalCount,
    };
  } catch (error) {
    throw error;
  }
}

export async function fetchUserMediaPosts(
  userId: string,
  {
    pageNumber = 1,
    pageSize = 10,
  }: {
    pageNumber?: number;
    pageSize?: number;
  } = {}
) {
  return fetchUserPosts(userId, {
    pageNumber,
    pageSize,
    onlyWithMedia: true,
  });
}

export async function fetchUserRepliesReceived(
  userId: string,
  {
    pageNumber = 1,
    pageSize = 10,
    onlyWithMedia = false,
  }: {
    pageNumber?: number;
    pageSize?: number;
    onlyWithMedia?: boolean;
  } = {}
) {
  try {
    await connectToDB();

    const user = await User.findOne(resolveUserQuery(userId)).select("_id id name image");
    if (!user?._id) return null;

    const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
    const skipAmount = (normalizedPageNumber - 1) * normalizedPageSize;

    const authoredThreads = await Thread.find({ author: user._id }).select("_id").lean();
    const authoredThreadIds = Array.from(
      new Set(
        authoredThreads
          .map((thread) => toIdString(thread._id))
          .filter(Boolean)
      )
    );

    if (!authoredThreadIds.length) {
      return {
        id: user.id,
        name: user.name,
        image: user.image,
        threads: [],
        isNext: false,
        totalCount: 0,
      };
    }

    const query: {
      parentId: { $in: string[] };
      author: { $ne: unknown };
      media?: { $exists: true; $ne: [] };
    } = {
      parentId: { $in: authoredThreadIds },
      author: { $ne: user._id },
    };

    if (onlyWithMedia) {
      query.media = { $exists: true, $ne: [] };
    }

    const totalCount = await Thread.countDocuments(query);

    const rawReplies = await Thread.find(query)
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(normalizedPageSize)
      .populate([
        {
          path: "community",
          model: Community,
          select: "name id image _id",
        },
        {
          path: "author",
          model: User,
          select: "name image id",
        },
        {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "name image id",
          },
        },
      ])
      .lean();

    const replies = (rawReplies as ThreadView[]).map(serializeThread);

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      threads: replies,
      isNext: totalCount > skipAmount + replies.length,
      totalCount,
    };
  } catch (error) {
    throw error;
  }
}

export async function fetchUserStats(userId: string) {
  try {
    await connectToDB();

    const user = await User.findOne(resolveUserQuery(userId)).select("_id");
    if (!user?._id) {
      return { threadCount: 0, replyCount: 0, mediaCount: 0 };
    }

    const threadCount = await Thread.countDocuments({
      author: user._id,
      parentId: { $in: [null, undefined, ""] },
    });

    const mediaCount = await Thread.countDocuments({
      author: user._id,
      parentId: { $in: [null, undefined, ""] },
      media: { $exists: true, $ne: [] },
    });

    const authoredThreads = await Thread.find({ author: user._id }).select("_id").lean();
    const authoredThreadIds = authoredThreads
      .map((thread) => toIdString(thread._id))
      .filter(Boolean);

    const replyCount = authoredThreadIds.length
      ? await Thread.countDocuments({
          parentId: { $in: authoredThreadIds },
          author: { $ne: user._id },
        })
      : 0;

    return { threadCount, replyCount, mediaCount };
  } catch (error) {
    throw error;
  }
}

// Almost similar to Thead (search + pagination) and Community (search + pagination)
export async function fetchUsers({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}) {
  try {
    await connectToDB();

    const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;

    // Calculate the number of users to skip based on the page number and page size.
    const skipAmount = (normalizedPageNumber - 1) * normalizedPageSize;

    // Create a case-insensitive regular expression for the provided search string.
    const regex = new RegExp(searchString, "i");

    // Create an initial query object to filter users.
    const query: mongoose.AnyObject = {
      id: { $ne: userId }, // Exclude the current user from the results.
    };

    // If the search string is not empty, add the $or operator to match either username or name fields.
    if (searchString.trim() !== "") {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    // Define the sort options for the fetched users.
    const sortOptions = { _id: sortBy };

    const usersQuery = User.find(query)
      .select("id name username image")
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(normalizedPageSize)
      .lean();

    // Count the total number of users that match the search criteria (without pagination).
    const totalUsersCount = await User.countDocuments(query);

    const rawUsers = await usersQuery.exec();

    const users = rawUsers.map((user) => ({
      id: typeof user.id === "string" ? user.id : toIdString(user.id),
      name: typeof user.name === "string" ? user.name : "",
      username: typeof user.username === "string" ? user.username : "",
      image: typeof user.image === "string" ? user.image : "",
    }));

    // Check if there are more users beyond the current page.
    const isNext = totalUsersCount > skipAmount + users.length;

    return { users, isNext };
  } catch (error) {
    throw error;
  }
}

async function getActivity(
  userId: string,
  {
    sourceLimit = 160,
  }: {
    sourceLimit?: number;
  } = {}
) {
  try {
    await connectToDB();

    const normalizedSourceLimit = Number.isFinite(sourceLimit) && sourceLimit > 0
      ? Math.min(sourceLimit, 1200)
      : 160;

    const currentUser = await User.findOne(resolveUserQuery(userId)).select(
      "_id id communities"
    );
    if (!currentUser?._id) {
      return [];
    }

    const currentUserObjectId = currentUser._id;
    const currentUserClerkId = currentUser.id;

    const ownThreads = await Thread.find({ author: currentUser._id })
      .sort({ createdAt: -1 })
      .limit(normalizedSourceLimit * 2)
      .select("_id author parentId community createdAt")
      .lean();

    const ownThreadIds = ownThreads
      .map((thread) => toIdString(thread._id))
      .filter(Boolean);

    const ownReplyIds = ownThreads
      .filter((thread) => !!thread.parentId)
      .map((thread) => toIdString(thread._id))
      .filter(Boolean);

    const conversationRootIds = ownThreads
      .filter((thread) => !!thread.parentId)
      .map((thread) => toIdString(thread.parentId))
      .filter((value) => value.length > 0);

    const directRepliesPromise = Thread.find({
      parentId: { $in: ownThreadIds },
      author: { $ne: currentUser._id },
    })
      .sort({ createdAt: -1 })
      .limit(normalizedSourceLimit)
      .select("_id parentId author community createdAt")
      .populate({
        path: "author",
        model: User,
        select: "id name username image",
      })
      .populate({
        path: "community",
        model: Community,
        select: "id name image",
      })
      .lean();

    const nestedRepliesPromise = Thread.find({
      parentId: { $in: [...ownReplyIds, ...conversationRootIds] },
      author: { $ne: currentUser._id },
    })
      .sort({ createdAt: -1 })
      .limit(normalizedSourceLimit)
      .select("_id parentId author community createdAt")
      .populate({
        path: "author",
        model: User,
        select: "id name username image",
      })
      .populate({
        path: "community",
        model: Community,
        select: "id name image",
      })
      .lean();

    const communityIds = Array.isArray(currentUser.communities)
      ? currentUser.communities
      : [];

    const communityActivityPromise = communityIds.length
      ? Thread.find({
          community: { $in: communityIds },
          author: { $ne: currentUser._id },
        })
          .sort({ createdAt: -1 })
          .limit(normalizedSourceLimit)
          .select("_id parentId author community createdAt")
          .populate({
            path: "author",
            model: User,
            select: "id name username image",
          })
          .populate({
            path: "community",
            model: Community,
            select: "id name image",
          })
          .lean()
      : Promise.resolve([]);

    const [directReplies, nestedReplies, communityActivity] = await Promise.all([
      directRepliesPromise,
      nestedRepliesPromise,
      communityActivityPromise,
    ]);

    const ownThreadObjectIds = ownThreadIds
      .map((value) => String(value))
      .filter((value) => mongoose.Types.ObjectId.isValid(value))
      .map((value) => new mongoose.Types.ObjectId(value));

    const ownThreadsWithReactions = ownThreadObjectIds.length
      ? await Thread.find({
          _id: { $in: ownThreadObjectIds },
          $or: [{ likes: { $exists: true, $ne: [] } }, { reposts: { $exists: true, $ne: [] } }],
        })
          .sort({ createdAt: -1 })
          .limit(normalizedSourceLimit)
          .select("_id parentId createdAt community likes reposts")
          .populate({
            path: "community",
            model: Community,
            select: "id name image",
          })
          .lean()
      : [];

    const reactionUserIds = Array.from(
      new Set(
        ownThreadsWithReactions.flatMap((thread) => {
          const likeIds = Array.isArray(thread.likes)
            ? thread.likes.map((value: unknown) => String(value))
            : [];
          const repostIds = Array.isArray(thread.reposts)
            ? thread.reposts.map((value: unknown) => String(value))
            : [];

          return [...likeIds, ...repostIds].filter(
            (value) => value && value !== currentUserClerkId
          );
        })
      )
    );

    const reactionUsers = reactionUserIds.length
      ? await User.find({ id: { $in: reactionUserIds } })
          .select("_id id name username image")
          .lean()
      : [];

    const reactionUserMap = new Map(
      reactionUsers.map((user) => [
        user.id,
        {
          _id: user._id,
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      ])
    );

    const collected: ActivityThread[] = [
      ...(directReplies as ActivityThread[]).map((item) => ({
        ...item,
        type: "reply" as const,
      })),
      ...(nestedReplies as ActivityThread[]).map((item) => ({
        ...item,
        type: "nested_reply" as const,
      })),
      ...(communityActivity as ActivityThread[]).map((item) => ({
        ...item,
        type: "community" as const,
      })),
    ];

    for (const thread of ownThreadsWithReactions) {
      const threadId = String(thread._id ?? "");
      if (!threadId) continue;

      const parentId = thread.parentId ? String(thread.parentId) : null;
      const createdAt = thread.createdAt
        ? new Date(thread.createdAt as string | number | Date).toISOString()
        : new Date().toISOString();
      const community = thread.community
        ? {
            id: thread.community.id ?? "",
            name: thread.community.name ?? "",
            image: thread.community.image ?? "",
          }
        : null;

      const likeIds = Array.isArray(thread.likes)
        ? Array.from(new Set(thread.likes.map((value: unknown) => String(value))))
        : [];

      for (const likerId of likeIds) {
        if (!likerId || likerId === currentUserClerkId) continue;
        const actor = reactionUserMap.get(likerId);
        if (!actor) continue;

        collected.push({
          _id: `${threadId}-like-${likerId}`,
          threadId,
          parentId,
          createdAt,
          author: actor,
          community,
          type: "like" as const,
        });
      }

      const repostIds = Array.isArray(thread.reposts)
        ? Array.from(new Set(thread.reposts.map((value: unknown) => String(value))))
        : [];

      for (const reposterId of repostIds) {
        if (!reposterId || reposterId === currentUserClerkId) continue;
        const actor = reactionUserMap.get(reposterId);
        if (!actor) continue;

        collected.push({
          _id: `${threadId}-repost-${reposterId}`,
          threadId,
          parentId,
          createdAt,
          author: actor,
          community,
          type: "repost" as const,
        });
      }
    }

    const activityMap = new Map<string, ActivityEvent>();

    for (const item of collected) {
      const activityId = String(item._id ?? "");
      if (!activityId) continue;

      const authorObjectId = item.author?._id;
      const authorId = item.author?.id ?? toIdString(authorObjectId);
      const isSelfAction =
        (authorObjectId && String(authorObjectId) === String(currentUserObjectId)) ||
        (authorId && authorId === currentUserClerkId);
      if (isSelfAction) continue;
      const eventKey = `${item.type ?? "reply"}:${activityId}:${authorId}`;
      if (activityMap.has(eventKey)) continue;

      const threadId = toIdString(item.threadId ?? item.parentId ?? activityId);
      if (!mongoose.Types.ObjectId.isValid(threadId)) continue;

      const createdAt = item.createdAt
        ? new Date(item.createdAt as string | number | Date).toISOString()
        : new Date().toISOString();

      activityMap.set(eventKey, {
        _id: eventKey,
        threadId,
        parentId: item.parentId ? String(item.parentId) : null,
        createdAt,
        type: item.type ?? "reply",
        author: {
          id: item.author?.id ?? "",
          name: item.author?.name ?? "Someone",
          username: item.author?.username ?? "",
          image: item.author?.image ?? "",
        },
        community: item.community
          ? {
              id: item.community.id ?? "",
              name: item.community.name ?? "",
              image: item.community.image ?? "",
            }
          : null,
      });
    }

    return Array.from(activityMap.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    throw error;
  }
}

export async function getActivityPaginated({
  userId,
  pageNumber = 1,
  pageSize = 20,
}: {
  userId: string;
  pageNumber?: number;
  pageSize?: number;
}) {
  const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;

  const endIndex = normalizedPageNumber * normalizedPageSize;
  const sourceLimit = Math.min(Math.max(endIndex * 6, normalizedPageSize * 10), 1200);

  const activity = await getActivity(userId, {
    sourceLimit,
  });

  const startIndex = (normalizedPageNumber - 1) * normalizedPageSize;
  const paginatedEndIndex = startIndex + normalizedPageSize;

  return {
    activity: activity.slice(startIndex, paginatedEndIndex),
    isNext: paginatedEndIndex < activity.length,
  };
}

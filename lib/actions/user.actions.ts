"use server";

import mongoose, { SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";

import Community from "../models/community.model";
import Thread from "../models/thread.model";
import User from "../models/user.model";

import { connectToDB } from "../mongoose";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

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


export async function fetchUser(userId: string) {
  try {
    await connectToDB();

    return await User.findOne(resolveUserQuery(userId)).populate({
      path: "communities",
      model: Community,
    });
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

export async function fetchUserPosts(userId: string) {
  try {
    await connectToDB();

    const user = await User.findOne(resolveUserQuery(userId)).select("_id id name image");
    if (!user?._id) return null;

    const threads = await Thread.find({ author: user._id })
      .sort({ createdAt: -1 })
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

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      threads,
    };
  } catch (error) {
    console.error("Error fetching user threads:", error);
    throw error;
  }
}

export async function fetchUserRepliesReceived(userId: string) {
  try {
    await connectToDB();

    const user = await User.findOne(resolveUserQuery(userId)).select("_id id name image");
    if (!user?._id) return null;

    const authoredThreads = await Thread.find({ author: user._id }).select("_id").lean();
    const authoredThreadIds = authoredThreads
      .map((thread) => toIdString(thread._id))
      .filter(Boolean);

    if (!authoredThreadIds.length) {
      return {
        id: user.id,
        name: user.name,
        image: user.image,
        threads: [],
      };
    }

    const rawReplies = await Thread.find({
      parentId: { $in: authoredThreadIds },
      author: { $ne: user._id },
    })
      .sort({ createdAt: -1 })
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

    const replies = (rawReplies as ThreadView[]).map((thread) => ({
      ...thread,
      _id: toIdString(thread._id),
      parentId: toIdString(thread.parentId) || null,
      createdAt: thread.createdAt
        ? new Date(thread.createdAt as string | number | Date).toISOString()
        : new Date().toISOString(),
      author: thread.author
        ? {
            id: thread.author.id ?? "",
            name: thread.author.name ?? "Unknown",
            image: thread.author.image ?? "",
          }
        : undefined,
      community: thread.community
        ? {
            id: thread.community.id ?? "",
            name: thread.community.name ?? "",
            image: thread.community.image ?? "",
          }
        : null,
      children: Array.isArray(thread.children) ? thread.children : [],
      likes: Array.isArray(thread.likes)
        ? thread.likes.map((value) => String(value))
        : [],
      reposts: Array.isArray(thread.reposts)
        ? thread.reposts.map((value) => String(value))
        : [],
    }));

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      threads: replies,
    };
  } catch (error) {
    console.error("Error fetching received replies:", error);
    throw error;
  }
}

export async function fetchUserStats(userId: string) {
  try {
    await connectToDB();

    const user = await User.findOne(resolveUserQuery(userId)).select("_id");
    if (!user?._id) {
      return { threadCount: 0, replyCount: 0 };
    }

    const threadCount = await Thread.countDocuments({
      author: user._id,
      parentId: { $in: [null, undefined, ""] },
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

    return { threadCount, replyCount };
  } catch (error) {
    console.error("Error fetching user stats:", error);
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

    // Calculate the number of users to skip based on the page number and page size.
    const skipAmount = (pageNumber - 1) * pageSize;

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

    // Define the sort options for the fetched users based on createdAt field and provided sort order.
    const sortOptions = { createdAt: sortBy };

    const usersQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);

    // Count the total number of users that match the search criteria (without pagination).
    const totalUsersCount = await User.countDocuments(query);

    const users = await usersQuery.exec();

    // Check if there are more users beyond the current page.
    const isNext = totalUsersCount > skipAmount + users.length;

    return { users, isNext };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function getActivity(userId: string) {
  try {
    await connectToDB();

    const currentUser = await User.findOne(resolveUserQuery(userId)).select(
      "_id id communities"
    );
    if (!currentUser?._id) {
      return [];
    }

    const currentUserObjectId = currentUser._id;
    const currentUserClerkId = currentUser.id;

    const ownThreads = await Thread.find({ author: currentUser._id })
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
            ? thread.likes.map((value) => String(value))
            : [];
          const repostIds = Array.isArray(thread.reposts)
            ? thread.reposts.map((value) => String(value))
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

    const collected = [
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
        ? Array.from(new Set(thread.likes.map((value) => String(value))))
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
        ? Array.from(new Set(thread.reposts.map((value) => String(value))))
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
    console.error("Error fetching replies: ", error);
    throw error;
  }
}

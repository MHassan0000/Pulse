"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Thread from "../models/thread.model";
import Community from "../models/community.model";
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

type DescendantThread = {
  _id: unknown;
  author?: { _id?: unknown } | null;
  community?: { _id?: unknown } | null;
};

type FeedPostAuthor = {
  id: string;
  name: string;
  image: string;
};

type FeedPostCommunity = {
  id: string;
  name: string;
  image: string;
} | null;

type FeedPostChild = {
  author: {
    image: string;
  };
};

type FeedPost = {
  _id: string;
  parentId: string | null;
  text: string;
  createdAt: string;
  author: FeedPostAuthor;
  community: FeedPostCommunity;
  children: FeedPostChild[];
  likes: string[];
  reposts: string[];
  media: ThreadMedia[];
};

type RawMediaInput = {
  kind?: unknown;
  url?: unknown;
  mimeType?: unknown;
  size?: unknown;
  width?: unknown;
  height?: unknown;
  durationSec?: unknown;
  providerKey?: unknown;
};

const MEDIA_MIME_BY_KIND: Record<"image" | "video", Set<string>> = {
  image: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ]),
  video: new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]),
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

type ThreadDetailNode = {
  _id: string;
  parentId: string | null;
  text: string;
  createdAt: string;
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
  children: ThreadDetailNode[];
  likes: string[];
  reposts: string[];
  media: ThreadMedia[];
};

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

const serializeMediaItem = (item: RawMediaInput): ThreadMedia | null => {
  const kind = item.kind === "video" ? "video" : item.kind === "image" ? "image" : null;
  const fallbackUrl = typeof item.url === "string" ? item.url : "";
  const mimeType = typeof item.mimeType === "string" ? item.mimeType : "";
  const size = typeof item.size === "number" ? item.size : Number(item.size ?? 0);
  const width = typeof item.width === "number" ? item.width : null;
  const height = typeof item.height === "number" ? item.height : null;
  const durationSec = typeof item.durationSec === "number" ? item.durationSec : null;
  const providerKey =
    typeof item.providerKey === "string" ? item.providerKey.trim() : "";
  const url = toUploadThingCdnUrl(providerKey, fallbackUrl);

  if (!kind || !url || !mimeType || !Number.isFinite(size) || size <= 0 || !providerKey) {
    return null;
  }

  return {
    kind,
    url,
    mimeType,
    size,
    width,
    height,
    durationSec,
    providerKey,
  };
};

const normalizeMediaList = (media: unknown): ThreadMedia[] => {
  if (!Array.isArray(media)) return [];

  return media
    .map((item) => serializeMediaItem(item as RawMediaInput))
    .filter((item): item is ThreadMedia => Boolean(item));
};

const parseMediaPayload = (media: unknown): ThreadMedia[] => {
  const normalized = normalizeMediaList(media);
  const validated = ThreadMediaValidation.array().max(4).parse(normalized);

  for (const item of validated) {
    const allowedMime = MEDIA_MIME_BY_KIND[item.kind];
    if (!allowedMime.has(item.mimeType)) {
      throw new Error("Media kind and mime type do not match");
    }
  }

  return validated;
};

const serializeFeedPost = (post: {
  _id?: unknown;
  parentId?: unknown;
  text?: unknown;
  createdAt?: unknown;
  author?: {
    id?: unknown;
    name?: unknown;
    image?: unknown;
    _id?: unknown;
  } | null;
  community?: {
    id?: unknown;
    name?: unknown;
    image?: unknown;
    _id?: unknown;
  } | null;
  children?: Array<{ author?: { image?: unknown } | null }>;
  likes?: unknown[];
  reposts?: unknown[];
  media?: unknown[];
}): FeedPost => {
  const author = post.author ?? null;
  const community = post.community ?? null;

  const serializedAuthor: FeedPostAuthor = {
    id: toIdString(author?.id) || toIdString(author?._id),
    name: typeof author?.name === "string" ? author.name : "Unknown",
    image: typeof author?.image === "string" ? author.image : "",
  };

  const serializedCommunity: FeedPostCommunity = community
    ? {
        id: toIdString(community.id) || toIdString(community._id),
        name: typeof community.name === "string" ? community.name : "",
        image: typeof community.image === "string" ? community.image : "",
      }
    : null;

  return {
    _id: toIdString(post._id),
    parentId: toIdString(post.parentId) || null,
    text: typeof post.text === "string" ? post.text : "",
    createdAt: toIsoDateString(post.createdAt),
    author: serializedAuthor,
    community: serializedCommunity,
    children: Array.isArray(post.children)
      ? post.children.map((child) => ({
          author: {
            image:
              typeof child?.author?.image === "string"
                ? child.author.image
                : "",
          },
        }))
      : [],
    likes: Array.isArray(post.likes)
      ? post.likes.map((value) => String(value))
      : [],
    reposts: Array.isArray(post.reposts)
      ? post.reposts.map((value) => String(value))
      : [],
    media: normalizeMediaList(post.media),
  };
};

const serializeThreadDetailNode = (node: {
  _id?: unknown;
  parentId?: unknown;
  text?: unknown;
  createdAt?: unknown;
  author?: {
    id?: unknown;
    name?: unknown;
    image?: unknown;
    _id?: unknown;
  } | null;
  community?: {
    id?: unknown;
    name?: unknown;
    image?: unknown;
    _id?: unknown;
  } | null;
  children?: Array<unknown>;
  likes?: unknown[];
  reposts?: unknown[];
  media?: unknown[];
}): ThreadDetailNode => {
  const author = node.author ?? null;
  const community = node.community ?? null;

  return {
    _id: toIdString(node._id),
    parentId: toIdString(node.parentId) || null,
    text: typeof node.text === "string" ? node.text : "",
    createdAt: toIsoDateString(node.createdAt),
    author: {
      id: toIdString(author?.id) || toIdString(author?._id),
      name: typeof author?.name === "string" ? author.name : "Unknown",
      image: typeof author?.image === "string" ? author.image : "",
    },
    community: community
      ? {
          id: toIdString(community.id) || toIdString(community._id),
          name: typeof community.name === "string" ? community.name : "",
          image: typeof community.image === "string" ? community.image : "",
        }
      : null,
    children: Array.isArray(node.children)
      ? node.children.map((child) =>
          serializeThreadDetailNode(
            child as {
              _id?: unknown;
              parentId?: unknown;
              text?: unknown;
              createdAt?: unknown;
              author?: {
                id?: unknown;
                name?: unknown;
                image?: unknown;
                _id?: unknown;
              } | null;
              community?: {
                id?: unknown;
                name?: unknown;
                image?: unknown;
                _id?: unknown;
              } | null;
              children?: Array<unknown>;
              likes?: unknown[];
              reposts?: unknown[];
              media?: unknown[];
            }
          )
        )
      : [],
    likes: Array.isArray(node.likes)
      ? node.likes.map((value) => String(value))
      : [],
    reposts: Array.isArray(node.reposts)
      ? node.reposts.map((value) => String(value))
      : [],
    media: normalizeMediaList(node.media),
  };
};

export async function fetchPostsCursor({
  pageSize = 10,
  cursor,
}: {
  pageSize?: number;
  cursor?: string;
}) {
  await connectToDB();

  const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0
    ? Math.min(pageSize, 25)
    : 10;
  const query: {
    parentId: { $in: Array<null | undefined> };
    _id?: { $lt: mongoose.Types.ObjectId };
  } = {
    parentId: { $in: [null, undefined] },
  };

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const posts = await Thread.find(query)
    .sort({ _id: -1 })
    .limit(normalizedPageSize + 1)
    .populate({
      path: "author",
      model: User,
      select: "_id id name username image",
    })
    .populate({
      path: "community",
      model: Community,
      select: "_id id name image",
    })
    .populate({
      path: "children",
      populate: {
        path: "author",
        model: User,
        select: "_id name parentId image",
      },
    })
    .lean();

  const hasNext = posts.length > normalizedPageSize;
  const visiblePosts = hasNext ? posts.slice(0, normalizedPageSize) : posts;
  const serializedPosts = visiblePosts.map((post) =>
    serializeFeedPost(post as {
      _id?: unknown;
      parentId?: unknown;
      text?: unknown;
      createdAt?: unknown;
      author?: {
        id?: unknown;
        name?: unknown;
        image?: unknown;
        _id?: unknown;
      } | null;
      community?: {
        id?: unknown;
        name?: unknown;
        image?: unknown;
        _id?: unknown;
      } | null;
      children?: Array<{ author?: { image?: unknown } | null }>;
      likes?: unknown[];
      reposts?: unknown[];
      media?: unknown[];
    })
  );
  const nextCursor =
    hasNext && visiblePosts.length
      ? toIdString(visiblePosts[visiblePosts.length - 1]?._id)
      : null;

  return {
    posts: serializedPosts,
    nextCursor,
    hasNext,
  };
}

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
  media?: ThreadMedia[];
}

export async function createThread({
  text,
  author,
  communityId,
  path,
  media = [],
}: Params) {
  try {
    await connectToDB();

    const normalizedText = typeof text === "string" ? text.trim() : "";
    const parsedMedia = parseMediaPayload(media);

    if (normalizedText.length < 3 && parsedMedia.length === 0) {
      throw new Error("Thread must contain at least 3 characters or media");
    }

    const authorUser = await User.findOne({ id: author }).select("_id");
    if (!authorUser?._id) {
      throw new Error("Author user not found");
    }

    const communityIdObject = communityId
      ? await Community.findOne({ id: communityId }, { _id: 1 })
      : null;

    const createdThread = await Thread.create({
      text: normalizedText,
      author: authorUser._id,
      community: communityIdObject?._id ?? null,
      media: parsedMedia,
    });

    // Update User model
    await User.findByIdAndUpdate(authorUser._id, {
      $push: { threads: createdThread._id },
    });

    if (communityIdObject?._id) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject._id, {
        $push: { threads: createdThread._id },
      });
    }

    revalidatePath(path);
    return createdThread._id?.toString();
  } catch (error: unknown) {
    throw new Error(`Failed to create thread: ${getErrorMessage(error)}`);
  }
}

async function fetchAllChildThreads(threadId: string): Promise<DescendantThread[]> {
  await connectToDB();
  const childThreads = await Thread.find({ parentId: threadId }).lean();

  const descendantThreads: DescendantThread[] = [];
  for (const childThread of childThreads) {
    const childThreadId =
      typeof childThread._id === "string"
        ? childThread._id
        : childThread._id?.toString?.() ?? "";
    const descendants = childThreadId
      ? await fetchAllChildThreads(childThreadId)
      : [];
    descendantThreads.push(childThread, ...descendants);
  }

  return descendantThreads;
}

export async function deleteThread(
  id: string,
  path: string,
  actorUserId?: string
): Promise<void> {
  try {
    await connectToDB();

    // Find the thread to be deleted (the main thread)
    const mainThread = await Thread.findById(id).populate([
      {
        path: "author",
        model: User,
        select: "id _id",
      },
      {
        path: "community",
        model: Community,
        select: "_id",
      },
    ]);

    if (!mainThread) {
      throw new Error("Thread not found");
    }

    if (actorUserId) {
      const ownerId = (mainThread.author as { id?: string } | null)?.id;
      if (!ownerId || ownerId !== actorUserId) {
        throw new Error("Only the thread author can delete this thread");
      }
    }

    // Fetch all child threads and their descendants recursively
    const descendantThreads = await fetchAllChildThreads(id);

    // Get all descendant thread IDs including the main thread ID and child thread IDs
    const descendantThreadIds = [
      id,
      ...descendantThreads.map((thread) => thread._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantThreads.map((thread) => thread.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantThreads.map((thread) => thread.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child threads and their descendants
    await Thread.deleteMany({ _id: { $in: descendantThreadIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    );

    revalidatePath(path);
  } catch (error: unknown) {
    throw new Error(`Failed to delete thread: ${getErrorMessage(error)}`);
  }
}

export async function fetchThreadById(threadId: string) {
  await connectToDB();

  try {
    const normalizedId =
      threadId?.match?.(/[a-f0-9]{24}/i)?.[0] ?? threadId;
    const thread = await Thread.findById(normalizedId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      }) // Populate the community field with _id and name
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: Thread, // The model of the nested children (assuming it's the same "Thread" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .populate({
        path: "children",
        populate: {
          path: "children",
          populate: {
            path: "children",
            populate: {
              path: "author",
              model: User,
              select: "_id id name parentId image",
            },
          },
        },
      })
      .lean()
      .exec();

    if (!thread) return null;

    return serializeThreadDetailNode(
      thread as {
        _id?: unknown;
        parentId?: unknown;
        text?: unknown;
        createdAt?: unknown;
        author?: {
          id?: unknown;
          name?: unknown;
          image?: unknown;
          _id?: unknown;
        } | null;
        community?: {
          id?: unknown;
          name?: unknown;
          image?: unknown;
          _id?: unknown;
        } | null;
        children?: Array<unknown>;
        likes?: unknown[];
        reposts?: unknown[];
        media?: unknown[];
      }
    );
  } catch (err) {
    throw new Error(`Unable to fetch thread: ${getErrorMessage(err)}`);
  }
}

export async function addCommentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string,
  media: ThreadMedia[] = []
) {
  await connectToDB();

  try {
    const normalizedText = typeof commentText === "string" ? commentText.trim() : "";
    const parsedMedia = parseMediaPayload(media);

    if (normalizedText.length < 3 && parsedMedia.length === 0) {
      throw new Error("Reply must contain at least 3 characters or media");
    }

    const user = await User.findOne({ id: userId }).select("_id");
    if (!user?._id) {
      throw new Error("User not found");
    }

    // Find the original thread by its ID
    const originalThread = await Thread.findById(threadId);

    if (!originalThread) {
      throw new Error("Thread not found");
    }

    // Create the new comment thread
    const commentThread = new Thread({
      text: normalizedText,
      author: user._id,
      parentId: threadId, // Set the parentId to the original thread's ID
      media: parsedMedia,
    });

    // Save the comment thread to the database
    const savedCommentThread = await commentThread.save();

    // Keep user-thread relation updated for replies/profile tabs
    await User.findByIdAndUpdate(user._id, {
      $push: { threads: savedCommentThread._id },
    });

    // Add the comment thread's ID to the original thread's children array
    originalThread.children.push(savedCommentThread._id);

    // Save the updated original thread to the database
    await originalThread.save();

    revalidatePath(path);
  } catch (err) {
    throw new Error(`Unable to add comment: ${getErrorMessage(err)}`);
  }
}

export async function toggleLikeThread(
  threadId: string,
  userId: string,
  path: string
) {
  await connectToDB();

  const thread = await Thread.findById(threadId);
  if (!thread) throw new Error("Thread not found");

  const likes: string[] = Array.isArray(thread.likes)
    ? thread.likes.map((id: unknown) => String(id))
    : [];
  const alreadyLiked = likes.includes(userId);

  await Thread.findByIdAndUpdate(threadId, {
    [alreadyLiked ? "$pull" : "$addToSet"]: { likes: userId },
  });

  revalidatePath(path);
  return { liked: !alreadyLiked };
}

export async function toggleRepostThread(
  threadId: string,
  userId: string,
  path: string
) {
  await connectToDB();

  const thread = await Thread.findById(threadId);
  if (!thread) throw new Error("Thread not found");

  const reposts: string[] = Array.isArray(thread.reposts)
    ? thread.reposts.map((id: unknown) => String(id))
    : [];
  const alreadyReposted = reposts.includes(userId);

  await Thread.findByIdAndUpdate(threadId, {
    [alreadyReposted ? "$pull" : "$addToSet"]: { reposts: userId },
  });

  revalidatePath(path);
  return { reposted: !alreadyReposted };
}

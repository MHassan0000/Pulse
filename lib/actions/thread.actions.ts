"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Thread from "../models/thread.model";
import Community from "../models/community.model";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

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
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  try {
    await connectToDB();

    const authorUser = await User.findOne({ id: author }).select("_id");
    if (!authorUser?._id) {
      throw new Error("Author user not found");
    }

    const communityIdObject = communityId
      ? await Community.findOne({ id: communityId }, { _id: 1 })
      : null;

    const createdThread = await Thread.create({
      text,
      author: authorUser._id,
      community: communityIdObject?._id ?? null,
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
  path: string
) {
  await connectToDB();

  try {
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
      text: commentText,
      author: user._id,
      parentId: threadId, // Set the parentId to the original thread's ID
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

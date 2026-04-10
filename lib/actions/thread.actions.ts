"use server";

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

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  await connectToDB();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level threads) (a thread that is not a comment/reply).
  const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
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
      path: "children", // Populate the children field
      populate: {
        path: "author", // Populate the author field within children
        model: User,
        select: "_id name parentId image", // Select only _id and username fields of the author
      },
    })
    .lean();

  // Count the total number of top-level posts (threads) i.e., threads that are not comments.
  const totalPostsCount = await Thread.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
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

    return thread;
  } catch (err) {
    console.error("Error while fetching thread:", err);
    throw new Error("Unable to fetch thread");
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
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
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

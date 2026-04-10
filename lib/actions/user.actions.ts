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


export async function fetchUser(userId: string) {
  try {
    await connectToDB();

    return await User.findOne({ id: userId }).populate({
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

    const user = await User.findOne({ id: userId }).select("_id");
    if (!user?._id) return null;

    // Find all threads authored by the user with the given userId
    const threads = await User.findById(user._id).populate({
      path: "threads",
      model: Thread,
      options: { sort: { createdAt: -1 } },
      match: { author: user._id },
      populate: [
        {
          path: "community",
          model: Community,
          select: "name id image _id", // Select the "name" and "_id" fields from the "Community" model
        },
        {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "name image id", // Select the "name" and "_id" fields from the "User" model
          },
        },
      ],
    });

    if (!threads) return null;

    return threads;
  } catch (error) {
    console.error("Error fetching user threads:", error);
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

    const currentUser = await User.findOne({ id: userId }).select("_id communities");
    if (!currentUser?._id) {
      return [];
    }

    const currentUserObjectId = String(currentUser._id);

    const ownThreads = await Thread.find({ author: currentUser._id })
      .select("_id author parentId community createdAt")
      .lean();

    const ownThreadIds = ownThreads.map((thread) => thread._id);

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

    const replyThreadIds = ownThreads
      .filter((thread) => !!thread.parentId)
      .map((thread) => thread._id);

    const nestedRepliesPromise = Thread.find({
      parentId: { $in: replyThreadIds },
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

    type RawActivityItem = {
      _id: unknown;
      parentId?: unknown;
      createdAt?: unknown;
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
    };

    const collected = [
      ...(directReplies as RawActivityItem[]).map((item) => ({
        ...item,
        type: "reply" as const,
      })),
      ...(nestedReplies as RawActivityItem[]).map((item) => ({
        ...item,
        type: "nested_reply" as const,
      })),
      ...(communityActivity as RawActivityItem[]).map((item) => ({
        ...item,
        type: "community" as const,
      })),
    ];

    const activityMap = new Map<string, {
      _id: string;
      parentId: string | null;
      createdAt: string;
      type: "reply" | "nested_reply" | "community";
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
    }>();

    for (const item of collected) {
      const activityId = String(item._id ?? "");
      if (!activityId) continue;

      const authorId = String(item.author?._id ?? "");
      if (!authorId || authorId === currentUserObjectId) continue;
      if (activityMap.has(activityId)) continue;

      const createdAt = item.createdAt
        ? new Date(item.createdAt as string | number | Date).toISOString()
        : new Date().toISOString();

      activityMap.set(activityId, {
        _id: activityId,
        parentId: item.parentId ? String(item.parentId) : null,
        createdAt,
        type: item.type,
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

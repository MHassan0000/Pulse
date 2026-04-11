"use server";

import mongoose, { SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";

import Community from "../models/community.model";
import Thread from "../models/thread.model";
import User from "../models/user.model";

import { connectToDB } from "../mongoose";

const sanitizeCommunityUsername = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);

const isDuplicateKeyError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("duplicate key");
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

type CommunityThreadView = {
  _id: unknown;
  text?: unknown;
  parentId?: unknown;
  author?: {
    id?: unknown;
    name?: unknown;
    image?: unknown;
  } | null;
  community?: {
    id?: unknown;
    name?: unknown;
    image?: unknown;
  } | null;
  createdAt?: unknown;
  children?: Array<{ author?: { image?: unknown } | null }>;
  likes?: unknown[];
  reposts?: unknown[];
};

type SerializedCommunityThread = {
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
};

const serializeCommunityThread = (
  thread: CommunityThreadView
): SerializedCommunityThread => ({
  _id: toIdString(thread._id),
  text: typeof thread.text === "string" ? thread.text : "",
  parentId: toIdString(thread.parentId) || null,
  author: {
    id: toIdString(thread.author?.id),
    name: typeof thread.author?.name === "string" ? thread.author.name : "Unknown",
    image: typeof thread.author?.image === "string" ? thread.author.image : "",
  },
  community: thread.community
    ? {
        id: toIdString(thread.community.id),
        name: typeof thread.community.name === "string" ? thread.community.name : "",
        image: typeof thread.community.image === "string" ? thread.community.image : "",
      }
    : null,
  createdAt: toIsoDateString(thread.createdAt),
  children: Array.isArray(thread.children)
    ? thread.children.map((child) => ({
        author: {
          image:
            typeof child?.author?.image === "string"
              ? child.author.image
              : "",
        },
      }))
    : [],
  likes: Array.isArray(thread.likes)
    ? thread.likes.map((value) => String(value))
    : [],
  reposts: Array.isArray(thread.reposts)
    ? thread.reposts.map((value) => String(value))
    : [],
});

export async function createCommunity(
  id: string,
  name: string,
  username: string,
  image: string,
  bio: string,
  createdById: string // Change the parameter name to reflect it's an id
) {
  try {
    await connectToDB();

    // Find the user with the provided unique id
    const user = await User.findOne({ id: createdById });

    if (!user) {
      throw new Error("User not found"); // Handle the case if the user with the id is not found
    }

    const newCommunity = new Community({
      id,
      name,
      username,
      image,
      bio,
      createdBy: user._id, // Use the mongoose ID of the user
    });

    const createdCommunity = await newCommunity.save();

    // Update User model
    user.communities.push(createdCommunity._id);
    await user.save();

    return createdCommunity;
  } catch (error) {
    // Handle any errors
    console.error("Error creating community:", error);
    throw error;
  }
}

export async function fetchCommunityDetails(id: string) {
  try {
    await connectToDB();

    const normalizedId =
      id?.match?.(/[a-f0-9]{24}/i)?.[0] ?? id;
    const query =
      mongoose.Types.ObjectId.isValid(normalizedId)
        ? { $or: [{ id: normalizedId }, { _id: normalizedId }] }
        : { id: normalizedId };

    const communityDetails = await Community.findOne(query)
      .populate([
        {
          path: "createdBy",
          model: User,
          select: "id name username image",
        },
        {
          path: "members",
          model: User,
          select: "name username image _id id",
        },
      ])
      .lean();

    if (!communityDetails?._id) {
      return null;
    }

    const threadCount = await Thread.countDocuments({
      community: communityDetails._id,
      parentId: { $in: [null, undefined, ""] },
    });

    return {
      ...communityDetails,
      threadCount,
    };
  } catch (error) {
    // Handle any errors
    console.error("Error fetching community details:", error);
    throw error;
  }
}

export async function fetchCommunityPosts(
  id: string,
  {
    pageNumber = 1,
    pageSize = 10,
  }: {
    pageNumber?: number;
    pageSize?: number;
  } = {}
) {
  try {
    await connectToDB();

    const normalizedId =
      id?.match?.(/[a-f0-9]{24}/i)?.[0] ?? id;

    const query = mongoose.Types.ObjectId.isValid(normalizedId)
      ? { $or: [{ id: normalizedId }, { _id: normalizedId }] }
      : { id: normalizedId };

    const community = await Community.findOne(query).select("_id");
    if (!community?._id) return null;

    const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
    const skipAmount = (normalizedPageNumber - 1) * normalizedPageSize;

    const threadQuery = {
      community: community._id,
      parentId: { $in: [null, undefined, ""] },
    };

    const totalCount = await Thread.countDocuments(threadQuery);

    const rawThreads = await Thread.find(threadQuery)
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(normalizedPageSize)
      .populate([
        {
          path: "author",
          model: User,
          select: "name image id",
        },
        {
          path: "community",
          model: Community,
          select: "id name image",
        },
        {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "image _id",
          },
        },
      ])
      .lean();

    const threads = (rawThreads as CommunityThreadView[]).map(serializeCommunityThread);

    const communityInfo = await Community.findById(community._id)
      .select("id name image")
      .lean();

    if (!communityInfo) return null;

    return {
      id: communityInfo.id,
      name: communityInfo.name,
      image: communityInfo.image,
      threads,
      isNext: totalCount > skipAmount + threads.length,
      totalCount,
    };
  } catch (error) {
    // Handle any errors
    console.error("Error fetching community posts:", error);
    throw error;
  }
}

export async function fetchCommunities({
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: {
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}) {
  try {
    await connectToDB();

    // Calculate the number of communities to skip based on the page number and page size.
    const skipAmount = (pageNumber - 1) * pageSize;

    // Create a case-insensitive regular expression for the provided search string.
    const regex = new RegExp(searchString, "i");

    // Create an initial query object to filter communities.
    const query: mongoose.AnyObject = {};

    // If the search string is not empty, add the $or operator to match either username or name fields.
    if (searchString.trim() !== "") {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    // Define the sort options for the fetched communities based on createdAt field and provided sort order.
    const sortOptions = { createdAt: sortBy };

    // Create a query to fetch the communities based on the search and sort criteria.
    const communitiesQuery = Community.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize)
      .populate("members");

    // Count the total number of communities that match the search criteria (without pagination).
    const totalCommunitiesCount = await Community.countDocuments(query);

    const communities = await communitiesQuery.exec();

    // Check if there are more communities beyond the current page.
    const isNext = totalCommunitiesCount > skipAmount + communities.length;

    return { communities, isNext };
  } catch (error) {
    console.error("Error fetching communities:", error);
    throw error;
  }
}

export async function addMemberToCommunity(
  communityId: string,
  memberId: string
) {
  try {
    await connectToDB();

    // Find the community by its unique id
    const community = await Community.findOne({ id: communityId });

    if (!community) {
      throw new Error("Community not found");
    }

    // Find the user by their unique id
    const user = await User.findOne({ id: memberId });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user is already a member of the community
    if (community.members.includes(user._id)) {
      throw new Error("User is already a member of the community");
    }

    // Add the user's _id to the members array in the community
    community.members.push(user._id);
    await community.save();

    // Add the community's _id to the communities array in the user
    user.communities.push(community._id);
    await user.save();

    return community;
  } catch (error) {
    // Handle any errors
    console.error("Error adding member to community:", error);
    throw error;
  }
}

export async function removeUserFromCommunity(
  userId: string,
  communityId: string
) {
  try {
    await connectToDB();

    const userIdObject = await User.findOne({ id: userId }, { _id: 1 });
    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    if (!userIdObject) {
      throw new Error("User not found");
    }

    if (!communityIdObject) {
      throw new Error("Community not found");
    }

    // Remove the user's _id from the members array in the community
    await Community.updateOne(
      { _id: communityIdObject._id },
      { $pull: { members: userIdObject._id } }
    );

    // Remove the community's _id from the communities array in the user
    await User.updateOne(
      { _id: userIdObject._id },
      { $pull: { communities: communityIdObject._id } }
    );

    return { success: true };
  } catch (error) {
    // Handle any errors
    console.error("Error removing user from community:", error);
    throw error;
  }
}

export async function updateCommunityInfo(
  communityId: string,
  name: string,
  username: string,
  image: string,
  bio: string
) {
  try {
    await connectToDB();

    const normalizedName = name.trim();
    const normalizedUsername = sanitizeCommunityUsername(username);
    const normalizedImage = image.trim();
    const normalizedBio = bio.trim();

    if (normalizedName.length < 3) {
      throw new Error("Community name must be at least 3 characters");
    }

    if (normalizedUsername.length < 3) {
      throw new Error("Community username must be at least 3 characters");
    }

    if (normalizedBio.length < 3) {
      throw new Error("Community bio must be at least 3 characters");
    }

    const existingCommunity = await Community.findOne({ id: communityId }).select("username");
    if (!existingCommunity) {
      throw new Error("Community not found");
    }

    const candidateHandles = Array.from(
      new Set([
        normalizedUsername,
        `${normalizedUsername}-${communityId.slice(-6).toLowerCase()}`,
        sanitizeCommunityUsername(existingCommunity.username ?? ""),
      ].filter((value) => value && value.length >= 3))
    );

    let updatedCommunity = null;

    for (const handle of candidateHandles) {
      try {
        updatedCommunity = await Community.findOneAndUpdate(
          { id: communityId },
          {
            name: normalizedName,
            username: handle,
            image: normalizedImage,
            bio: normalizedBio,
          }
        );

        if (updatedCommunity) break;
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          continue;
        }

        throw error;
      }
    }

    if (!updatedCommunity) {
      throw new Error("Unable to update community handle. Please try a different username.");
    }

    return updatedCommunity;
  } catch (error) {
    // Handle any errors
    console.error("Error updating community information:", error);
    throw error;
  }
}

export async function deleteCommunity(communityId: string) {
  try {
    await connectToDB();

    // Find the community by its ID and delete it
    const deletedCommunity = await Community.findOneAndDelete({
      id: communityId,
    });

    if (!deletedCommunity) {
      throw new Error("Community not found");
    }

    // Delete all threads associated with the community
    await Thread.deleteMany({ community: deletedCommunity._id });

    // Find all users who are part of the community
    const communityUsers = await User.find({ communities: deletedCommunity._id });

    // Remove the community from the 'communities' array for each user
    const updateUserPromises = communityUsers.map((user) => {
      user.communities.pull(deletedCommunity._id);
      return user.save();
    });

    await Promise.all(updateUserPromises);

    return deletedCommunity;
  } catch (error) {
    console.error("Error deleting community: ", error);
    throw error;
  }
}

export async function joinCommunity(
  communityId: string,
  memberId: string,
  path: string
) {
  await addMemberToCommunity(communityId, memberId);
  revalidatePath(path);
  revalidatePath(`/communities/${communityId}`);
  return { success: true };
}

export async function leaveCommunity(
  communityId: string,
  memberId: string,
  path: string
) {
  await removeUserFromCommunity(memberId, communityId);
  revalidatePath(path);
  revalidatePath(`/communities/${communityId}`);
  return { success: true };
}

export async function updateCommunityInfoAsAdmin(
  communityId: string,
  name: string,
  username: string,
  image: string,
  bio: string,
  adminUserId: string,
  path: string
) {
  await connectToDB();

  const community = await Community.findOne({ id: communityId }).populate({
    path: "createdBy",
    model: User,
    select: "id",
  });

  if (!community) throw new Error("Community not found");

  const ownerId = (community.createdBy as { id?: string } | null)?.id;
  if (!ownerId || ownerId !== adminUserId) {
    throw new Error("Only community admin can update this community");
  }

  await updateCommunityInfo(communityId, name, username, image, bio);
  revalidatePath(path);
  revalidatePath(`/communities/${communityId}`);
  return { success: true };
}

export async function removeMemberFromCommunityAsAdmin(
  communityId: string,
  targetUserId: string,
  adminUserId: string,
  path: string
) {
  await connectToDB();

  const community = await Community.findOne({ id: communityId }).populate({
    path: "createdBy",
    model: User,
    select: "id",
  });

  if (!community) throw new Error("Community not found");

  const ownerId = (community.createdBy as { id?: string } | null)?.id;
  if (!ownerId || ownerId !== adminUserId) {
    throw new Error("Only community admin can remove members");
  }

  await removeUserFromCommunity(targetUserId, communityId);
  revalidatePath(path);
  revalidatePath(`/communities/${communityId}`);
  return { success: true };
}

export async function deleteCommunityAsAdmin(
  communityId: string,
  adminUserId: string,
  path: string
) {
  await connectToDB();

  const community = await Community.findOne({ id: communityId }).populate({
    path: "createdBy",
    model: User,
    select: "id",
  });

  if (!community) throw new Error("Community not found");

  const ownerId = (community.createdBy as { id?: string } | null)?.id;
  if (!ownerId || ownerId !== adminUserId) {
    throw new Error("Only community admin can delete this community");
  }

  await deleteCommunity(communityId);
  revalidatePath(path);
  revalidatePath("/communities");
  return { success: true };
}

"use server";

import mongoose, { SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";

import Community from "../models/community.model";
import Thread from "../models/thread.model";
import User from "../models/user.model";

import { connectToDB } from "../mongoose";
import { ThreadMediaValidation } from "../validations/thread";

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
        url: typeof mediaItem.url === "string" ? mediaItem.url : "",
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
            ? mediaItem.providerKey
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
  media: ThreadMedia[];
};

type CommunityMember = {
  id: string;
  name: string;
  username: string;
  image: string;
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
  media: normalizeMediaList(thread.media),
});

export async function fetchCommunityDetails(id: string) {
  await connectToDB();

  const normalizedId =
    id?.match?.(/[a-f0-9]{24}/i)?.[0] ?? id;
  const query =
    mongoose.Types.ObjectId.isValid(normalizedId)
      ? { $or: [{ id: normalizedId }, { _id: normalizedId }] }
      : { id: normalizedId };

  const communityDetails = await Community.findOne(query)
    .select("_id id name username image bio createdBy")
    .populate({
      path: "createdBy",
      model: User,
      select: "id name username image",
    })
    .lean() as {
      _id?: unknown;
      id?: unknown;
      name?: unknown;
      username?: unknown;
      image?: unknown;
      bio?: unknown;
      createdBy?: {
        id?: unknown;
        name?: unknown;
        username?: unknown;
        image?: unknown;
      } | null;
    } | null;

  if (!communityDetails?._id) {
    return null;
  }

  const threadCount = await Thread.countDocuments({
    community: communityDetails._id,
    parentId: { $in: [null, undefined, ""] },
  });

  const mediaCount = await Thread.countDocuments({
    community: communityDetails._id,
    parentId: { $in: [null, undefined, ""] },
    media: { $exists: true, $ne: [] },
  });

  const memberCount = await User.countDocuments({ communities: communityDetails._id });

  return {
    _id: toIdString(communityDetails._id),
    id: toIdString(communityDetails.id),
    name: typeof communityDetails.name === "string" ? communityDetails.name : "",
    username:
      typeof communityDetails.username === "string"
        ? communityDetails.username
        : "",
    image: typeof communityDetails.image === "string" ? communityDetails.image : "",
    bio: typeof communityDetails.bio === "string" ? communityDetails.bio : "",
    createdBy: communityDetails.createdBy
      ? {
          id: toIdString(communityDetails.createdBy.id),
          name:
            typeof communityDetails.createdBy.name === "string"
              ? communityDetails.createdBy.name
              : "",
          username:
            typeof communityDetails.createdBy.username === "string"
              ? communityDetails.createdBy.username
              : "",
          image:
            typeof communityDetails.createdBy.image === "string"
              ? communityDetails.createdBy.image
              : "",
        }
      : null,
    memberCount,
    threadCount,
    mediaCount,
  };
}

export async function fetchCommunityMembersPaginated(
  id: string,
  {
    pageNumber = 1,
    pageSize = 20,
  }: {
    pageNumber?: number;
    pageSize?: number;
  } = {}
) {
  await connectToDB();

  const normalizedId = id?.match?.(/[a-f0-9]{24}/i)?.[0] ?? id;
  const query = mongoose.Types.ObjectId.isValid(normalizedId)
    ? { $or: [{ id: normalizedId }, { _id: normalizedId }] }
    : { id: normalizedId };

  const community = await Community.findOne(query).select("_id").lean();
  if (!community?._id) return null;

  const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;
  const skipAmount = (normalizedPageNumber - 1) * normalizedPageSize;

  const totalCount = await User.countDocuments({ communities: community._id });

  const rawMembers = await User.find({ communities: community._id })
    .select("id name username image")
    .sort({ _id: -1 })
    .skip(skipAmount)
    .limit(normalizedPageSize)
    .lean();

  const members: CommunityMember[] = rawMembers.map((member) => ({
    id: toIdString(member.id),
    name: typeof member.name === "string" ? member.name : "",
    username: typeof member.username === "string" ? member.username : "",
    image: typeof member.image === "string" ? member.image : "",
  }));

  return {
    members,
    isNext: totalCount > skipAmount + members.length,
    totalCount,
  };
}

export async function fetchCommunityPosts(
  id: string,
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

  const threadQuery: {
    community: unknown;
    parentId: { $in: Array<null | undefined | ""> };
    media?: { $exists: true; $ne: [] };
  } = {
    community: community._id,
    parentId: { $in: [null, undefined, ""] },
  };

  if (onlyWithMedia) {
    threadQuery.media = { $exists: true, $ne: [] };
  }

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
    id: toIdString(communityInfo.id),
    name: typeof communityInfo.name === "string" ? communityInfo.name : "",
    image: typeof communityInfo.image === "string" ? communityInfo.image : "",
    threads,
    isNext: totalCount > skipAmount + threads.length,
    totalCount,
  };
}

export async function fetchCommunityMediaPosts(
  id: string,
  {
    pageNumber = 1,
    pageSize = 10,
  }: {
    pageNumber?: number;
    pageSize?: number;
  } = {}
) {
  return fetchCommunityPosts(id, {
    pageNumber,
    pageSize,
    onlyWithMedia: true,
  });
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
  await connectToDB();

  const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;
  const skipAmount = (normalizedPageNumber - 1) * normalizedPageSize;

  const regex = new RegExp(searchString, "i");

  const query: mongoose.AnyObject = {};

  if (searchString.trim() !== "") {
    query.$or = [
      { username: { $regex: regex } },
      { name: { $regex: regex } },
    ];
  }

  const sortOptions = { _id: sortBy };

  const communitiesQuery = Community.find(query)
    .select("id name username image bio members")
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(normalizedPageSize)
    .lean();

  const totalCommunitiesCount = await Community.countDocuments(query);

  const rawCommunities = await communitiesQuery.exec();

  const communities = rawCommunities.map((community) => ({
    id: toIdString(community.id),
    name: typeof community.name === "string" ? community.name : "",
    username: typeof community.username === "string" ? community.username : "",
    image: typeof community.image === "string" ? community.image : "",
    bio: typeof community.bio === "string" ? community.bio : "",
    membersCount: Array.isArray(community.members) ? community.members.length : 0,
  }));

  const isNext = totalCommunitiesCount > skipAmount + communities.length;

  return { communities, isNext };
}

async function removeUserFromCommunity(
  userId: string,
  communityId: string
) {
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

  await Community.updateOne(
    { _id: communityIdObject._id },
    { $pull: { members: userIdObject._id } }
  );

  await User.updateOne(
    { _id: userIdObject._id },
    { $pull: { communities: communityIdObject._id } }
  );

  return { success: true };
}

async function updateCommunityInfo(
  communityId: string,
  name: string,
  username: string,
  image: string,
  bio: string
) {
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
}

async function deleteCommunity(communityId: string) {
  await connectToDB();

  const deletedCommunity = await Community.findOneAndDelete({
    id: communityId,
  });

  if (!deletedCommunity) {
    throw new Error("Community not found");
  }

  await Thread.deleteMany({ community: deletedCommunity._id });

  const communityUsers = await User.find({ communities: deletedCommunity._id });

  const updateUserPromises = communityUsers.map((user) => {
    user.communities.pull(deletedCommunity._id);
    return user.save();
  });

  await Promise.all(updateUserPromises);

  return deletedCommunity;
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

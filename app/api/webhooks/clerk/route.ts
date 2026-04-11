import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { NextResponse } from "next/server";

import Community from "@/lib/models/community.model";
import Thread from "@/lib/models/thread.model";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type EventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "organization.created"
  | "organizationInvitation.created"
  | "organizationMembership.created"
  | "organizationMembership.deleted"
  | "organization.updated"
  | "organization.deleted";

type ClerkOrgData = {
  id?: string;
  name?: string;
  slug?: string;
  image_url?: string;
  logo_url?: string;
  created_by?: string;
  organization?: { id?: string };
  public_user_data?: { user_id?: string };
};

type ClerkMembershipData = {
  id?: string;
  organization?: { id?: string };
  public_user_data?: { user_id?: string };
};

type ClerkUserData = {
  id?: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const logWebhookError = (...args: unknown[]) => {
  void args;
};

const isDatabaseConnectionError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("server selection") ||
    message.includes("timed out") ||
    message.includes("ecconn") ||
    message.includes("querysrv") ||
    message.includes("mongo")
  );
};

const buildFallbackUsername = (organizationId: string) =>
  `community-${organizationId.replace(/[^a-zA-Z0-9_-]/g, "-")}`.toLowerCase();

const sanitizeHandle = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);

const buildOrganizationUsernameCandidates = (organizationId: string, slug?: string) => {
  const fallback = buildFallbackUsername(organizationId);
  const slugHandle = sanitizeHandle(slug ?? "");
  const suffix = organizationId.slice(-6).toLowerCase();

  const values = [
    slugHandle,
    slugHandle ? `${slugHandle}-${suffix}` : "",
    fallback,
    `${fallback}-${suffix}`,
  ].filter(Boolean);

  return Array.from(new Set(values));
};

const buildFallbackUserUsername = (userId: string) =>
  `user-${userId.replace(/[^a-zA-Z0-9_-]/g, "-")}`.toLowerCase();

const isDuplicateKeyError = (error: unknown) =>
  getErrorMessage(error).toLowerCase().includes("duplicate key");

type UpsertCommunityParams = {
  id: string;
  name: string;
  slug?: string;
  image: string;
};

const upsertCommunityFromOrganization = async ({
  id,
  name,
  slug,
  image,
}: UpsertCommunityParams) => {
  const existing = await Community.findOne({ id }).select("_id username");
  const candidates = buildOrganizationUsernameCandidates(id, slug);

  const existingUsername =
    typeof existing?.username === "string" ? sanitizeHandle(existing.username) : "";

  if (existingUsername) {
    candidates.unshift(existingUsername);
  }

  const dedupedCandidates = Array.from(new Set(candidates));

  for (const username of dedupedCandidates) {
    try {
      const community = await Community.findOneAndUpdate(
        { id },
        {
          $set: {
            id,
            name,
            username,
            image,
            bio: "org bio",
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).select("_id username");

      if (community?._id) {
        return community;
      }
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  const fallback = buildFallbackUsername(id);
  const lastAttempt = await Community.findOneAndUpdate(
    { id },
    {
      $set: {
        id,
        name,
        username: fallback,
        image,
        bio: "org bio",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select("_id username");

  if (!lastAttempt?._id) {
    throw new Error("Failed to create or update community record");
  }

  return lastAttempt;
};

const linkCommunityOwner = async (communityId: string, createdByClerkId: string) => {
  const owner = await User.findOne({ id: createdByClerkId }).select("_id");

  if (!owner?._id) {
    return;
  }

  try {
    await Community.updateOne(
      { _id: communityId },
      {
        $set: { createdBy: owner._id },
        $addToSet: { members: owner._id },
      }
    );

    await User.updateOne(
      { _id: owner._id },
      { $addToSet: { communities: communityId } }
    );
  } catch {
    // Non-fatal for idempotent webhook flow.
  }
};

const upsertUserFromClerk = async (data: ClerkUserData) => {
  const userId = data.id;
  if (!userId) {
    throw new Error("Missing user id in webhook payload");
  }

  const fallbackUsername = buildFallbackUserUsername(userId);
  const preferredUsername =
    (typeof data.username === "string" ? data.username.trim() : "") ||
    fallbackUsername;
  const resolvedUsername = preferredUsername.toLowerCase();

  const derivedName = [data.first_name ?? "", data.last_name ?? ""]
    .join(" ")
    .trim();
  const resolvedName = derivedName || preferredUsername || "New User";
  const image = data.image_url || "";

  const update = {
    $setOnInsert: {
      id: userId,
      username: resolvedUsername,
      name: resolvedName,
      image,
      bio: "",
      onboarded: false,
      threads: [],
      communities: [],
    },
    $set: {
      image,
      ...(derivedName ? { name: resolvedName } : {}),
      ...(typeof data.username === "string" && data.username.trim()
        ? { username: resolvedUsername }
        : {}),
    },
  };

  try {
    await User.findOneAndUpdate({ id: userId }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error) || resolvedUsername === fallbackUsername) {
      throw error;
    }

    await User.findOneAndUpdate(
      { id: userId },
      {
        $setOnInsert: {
          id: userId,
          username: fallbackUsername,
          name: resolvedName,
          image,
          bio: "",
          onboarded: false,
          threads: [],
          communities: [],
        },
        $set: {
          image,
          ...(derivedName ? { name: resolvedName } : {}),
          username: fallbackUsername,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }
};

const upsertMembership = async (membership: ClerkMembershipData) => {
  const organizationId = membership.organization?.id;
  const memberId = membership.public_user_data?.user_id;

  if (!organizationId || !memberId) {
    throw new Error("Missing membership data");
  }

  const [community, member] = await Promise.all([
    Community.findOne({ id: organizationId }).select("_id createdBy"),
    User.findOne({ id: memberId }).select("_id"),
  ]);

  if (!community || !member?._id) {
    return false;
  }

  await Community.updateOne(
    { _id: community._id },
    {
      $addToSet: { members: member._id },
      ...(community.createdBy
        ? {}
        : {
            $set: { createdBy: member._id },
          }),
    }
  );

  await User.updateOne(
    { _id: member._id },
    { $addToSet: { communities: community._id } }
  );

  return true;
};

const removeMembership = async (membership: ClerkMembershipData) => {
  const organizationId = membership.organization?.id;
  const memberId = membership.public_user_data?.user_id;

  if (!organizationId || !memberId) {
    throw new Error("Missing membership data");
  }

  const [community, member] = await Promise.all([
    Community.findOne({ id: organizationId }).select("_id"),
    User.findOne({ id: memberId }).select("_id"),
  ]);

  if (!community || !member) {
    return false;
  }

  await Community.updateOne(
    { _id: community._id },
    { $pull: { members: member._id } }
  );
  await User.updateOne(
    { _id: member._id },
    { $pull: { communities: community._id } }
  );

  return true;
};

export const POST = async (request: Request) => {
  const webhookSecret =
    process.env.CLERK_WEBHOOK_SECRET ||
    process.env.NEXT_CLERK_WEBHOOK_SECRET ||
    process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { message: "Missing Clerk webhook secret" },
      { status: 500 }
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { message: "Missing Svix headers" },
      { status: 400 }
    );
  }

  const payload = await request.text();
  const wh = new Webhook(webhookSecret);

  let event: WebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    logWebhookError("signature", error);
    return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
  }

  const eventType = event.type as EventType;
  const data = (event.data ?? {}) as ClerkOrgData;

  try {
    await connectToDB();
  } catch (error) {
    logWebhookError(eventType, error);
    return NextResponse.json(
      { message: "Database connection failed" },
      { status: 503 }
    );
  }

  if (eventType === "user.created" || eventType === "user.updated") {
    try {
      await upsertUserFromClerk(data as unknown as ClerkUserData);
      return NextResponse.json({ message: "User synced" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);
      if (isDatabaseConnectionError(err)) {
        return NextResponse.json(
          { message: "Database temporarily unavailable" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  if (eventType === "user.deleted") {
    try {
      const userData = data as unknown as ClerkUserData;
      const userId = userData.id;

      if (!userId) {
        return NextResponse.json({ message: "Missing user id" }, { status: 400 });
      }

      const user = await User.findOne({ id: userId }).select("_id");
      if (!user?._id) {
        return NextResponse.json({ message: "User already deleted" }, { status: 200 });
      }

      await Thread.deleteMany({ author: user._id });
      await Community.updateMany({ members: user._id }, { $pull: { members: user._id } });
      await Community.updateMany({ createdBy: user._id }, { $set: { createdBy: null } });
      await User.deleteOne({ _id: user._id });

      return NextResponse.json({ message: "User deleted" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);
      if (isDatabaseConnectionError(err)) {
        return NextResponse.json(
          { message: "Database temporarily unavailable" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen organization creation event
  if (eventType === "organization.created") {
    const { id, name, slug, logo_url, image_url, created_by } = data;

    try {
      if (!id || !name) {
        return NextResponse.json({ message: "Missing organization data" }, { status: 400 });
      }

      const organizationImage = logo_url || image_url || "";

      const community = await upsertCommunityFromOrganization({
        id,
        name,
        slug,
        image: organizationImage,
      });

      if (!community?._id) {
        throw new Error("Failed to create or update community record");
      }

      if (created_by) {
        await linkCommunityOwner(String(community._id), created_by);
      }

      return NextResponse.json({ message: "Organization synced" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);
      if (isDatabaseConnectionError(err)) {
        return NextResponse.json(
          { message: "Database temporarily unavailable" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen organization invitation creation event.
  // Just to show. You can avoid this or tell people that we can create a new mongoose action and
  // add pending invites in the database.
  if (eventType === "organizationInvitation.created") {
    return NextResponse.json({ message: "Invitation event received" }, { status: 200 });
  }

  // Listen organization membership (member invite & accepted) creation
  if (eventType === "organizationMembership.created") {
    try {
      const isLinked = await upsertMembership(data as unknown as ClerkMembershipData);

      if (!isLinked) {
        return NextResponse.json({ message: "Membership references not ready" }, { status: 200 });
      }

      return NextResponse.json({ message: "Member synced" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);
      if (isDatabaseConnectionError(err)) {
        return NextResponse.json(
          { message: "Database temporarily unavailable" },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen member deletion event
  if (eventType === "organizationMembership.deleted") {
    try {
      const removed = await removeMembership(data as unknown as ClerkMembershipData);

      if (!removed) {
        return NextResponse.json({ message: "Member already detached" }, { status: 200 });
      }

      return NextResponse.json({ message: "Member removed" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);
      if (isDatabaseConnectionError(err)) {
        return NextResponse.json(
          { message: "Database temporarily unavailable" },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen organization updation event
  if (eventType === "organization.updated") {
    try {
      const { id, logo_url, image_url, name, slug } = data;

      if (!id || !name) {
        return NextResponse.json({ message: "Missing organization update data" }, { status: 400 });
      }

      await upsertCommunityFromOrganization({
        id,
        name,
        slug,
        image: logo_url || image_url || "",
      });

      return NextResponse.json({ message: "Organization updated" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);
      if (isDatabaseConnectionError(err)) {
        return NextResponse.json(
          { message: "Database temporarily unavailable" },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen organization deletion event
  if (eventType === "organization.deleted") {
    try {
      const { id } = data;

      if (!id) {
        return NextResponse.json({ message: "Missing organization id" }, { status: 400 });
      }

      const community = await Community.findOne({ id }).select("_id");

      if (!community) {
        return NextResponse.json({ message: "Organization already deleted" }, { status: 200 });
      }

      await Thread.deleteMany({ community: community._id });
      await User.updateMany(
        { communities: community._id },
        { $pull: { communities: community._id } }
      );
      await Community.deleteOne({ _id: community._id });

      return NextResponse.json({ message: "Organization deleted" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ message: "Event ignored" }, { status: 200 });
};

import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { NextResponse } from "next/server";

import Community from "@/lib/models/community.model";
import Thread from "@/lib/models/thread.model";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventType =
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

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const logWebhookError = (eventType: string, error: unknown) => {
  console.error(`[clerk-webhook:${eventType}]`, getErrorMessage(error), error);
};

const buildFallbackUsername = (organizationId: string) =>
  `community-${organizationId.replace(/[^a-zA-Z0-9_-]/g, "-")}`.toLowerCase();

const isDuplicateKeyError = (error: unknown) =>
  getErrorMessage(error).toLowerCase().includes("duplicate key");

export const POST = async (request: Request) => {
  const webhookSecret =
    process.env.CLERK_WEBHOOK_SECRET || process.env.NEXT_CLERK_WEBHOOK_SECRET;

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
      { status: 500 }
    );
  }

  // Listen organization creation event
  if (eventType === "organization.created") {
    const { id, name, slug, logo_url, image_url, created_by } = data;

    try {
      if (!id || !name) {
        return NextResponse.json({ message: "Missing organization data" }, { status: 400 });
      }

      const fallbackUsername = buildFallbackUsername(id);
      const organizationUsername = (slug?.trim() || fallbackUsername).toLowerCase();
      const organizationImage = logo_url || image_url || "";

      let community;
      try {
        community = await Community.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              username: organizationUsername,
              image: organizationImage,
              bio: "org bio",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).select("_id");
      } catch (error) {
        if (!isDuplicateKeyError(error) || organizationUsername === fallbackUsername) {
          throw error;
        }

        community = await Community.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              username: fallbackUsername,
              image: organizationImage,
              bio: "org bio",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).select("_id");
      }

      if (!community?._id) {
        throw new Error("Failed to create or update community record");
      }

      if (created_by) {
        const owner = await User.findOne({ id: created_by }).select("_id");

        if (owner?._id) {
          await Community.updateOne(
            { _id: community._id },
            {
              $set: { createdBy: owner._id },
              $addToSet: { members: owner._id },
            }
          );

          await User.updateOne(
            { _id: owner._id },
            { $addToSet: { communities: community._id } }
          );
        } else {
          console.warn(
            `[clerk-webhook:${eventType}] owner not found yet for created_by=${created_by}; community synced without owner linkage`
          );
        }
      }

      return NextResponse.json({ message: "Organization synced" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);
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
    try {
      console.log("[clerk-webhook:organizationInvitation.created]", data);

      return NextResponse.json({ message: "Invitation created" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen organization membership (member invite & accepted) creation
  if (eventType === "organizationMembership.created") {
    try {
      const { organization, public_user_data } = data;
      console.log("[clerk-webhook:organizationMembership.created]", data);

      const organizationId = organization?.id;
      const memberId = public_user_data?.user_id;

      if (!organizationId || !memberId) {
        return NextResponse.json({ message: "Missing membership data" }, { status: 400 });
      }

      const community = await Community.findOne({ id: organizationId }).select(
        "_id createdBy"
      );
      const member = await User.findOne({ id: memberId }).select("_id");

      if (!community || !member?._id) {
        console.warn(
          `[clerk-webhook:${eventType}] references not ready (organizationId=${organizationId}, memberId=${memberId})`
        );
        return NextResponse.json({ message: "Membership references not ready" }, { status: 200 });
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

      return NextResponse.json({ message: "Member synced" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen member deletion event
  if (eventType === "organizationMembership.deleted") {
    try {
      const { organization, public_user_data } = data;
      console.log("[clerk-webhook:organizationMembership.deleted]", data);

      const organizationId = organization?.id;
      const memberId = public_user_data?.user_id;

      if (!organizationId || !memberId) {
        return NextResponse.json({ message: "Missing membership data" }, { status: 400 });
      }

      const community = await Community.findOne({ id: organizationId }).select("_id");
      const member = await User.findOne({ id: memberId }).select("_id");

      // Idempotent behavior: if either side is missing, treat as already detached.
      if (!community || !member) {
        return NextResponse.json({ message: "Member already detached" }, { status: 200 });
      }

      await Community.updateOne(
        { _id: community._id },
        { $pull: { members: member._id } }
      );
      await User.updateOne(
        { _id: member._id },
        { $pull: { communities: community._id } }
      );

      return NextResponse.json({ message: "Member removed" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);

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
      console.log("[clerk-webhook:organization.updated]", data);

      if (!id || !name) {
        return NextResponse.json({ message: "Missing organization update data" }, { status: 400 });
      }

      const fallbackUsername = buildFallbackUsername(id);
      const organizationUsername = (slug?.trim() || fallbackUsername).toLowerCase();

      try {
        await Community.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              username: organizationUsername,
              image: logo_url || image_url || "",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (error) {
        if (!isDuplicateKeyError(error) || organizationUsername === fallbackUsername) {
          throw error;
        }

        await Community.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              username: fallbackUsername,
              image: logo_url || image_url || "",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      return NextResponse.json({ message: "Organization updated" }, { status: 200 });
    } catch (err) {
      logWebhookError(eventType, err);

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
      console.log("[clerk-webhook:organization.deleted]", data);

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

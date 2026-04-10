import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { NextResponse } from "next/server";

import {
  addMemberToCommunity,
  createCommunity,
  deleteCommunity,
  removeUserFromCommunity,
  updateCommunityInfo,
} from "@/lib/actions/community.actions";

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
  } catch {
    return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
  }

  const eventType = event.type as EventType;
  const data = (event.data ?? {}) as ClerkOrgData;

  // Listen organization creation event
  if (eventType === "organization.created") {
    const { id, name, slug, logo_url, image_url, created_by } = data;

    try {
      if (!id || !name || !slug || !created_by) {
        return NextResponse.json({ message: "Missing organization data" }, { status: 400 });
      }

      try {
        await createCommunity(
          id,
          name,
          slug,
          logo_url || image_url || "",
          "org bio",
          created_by
        );
      } catch (creationError) {
        const message =
          creationError instanceof Error ? creationError.message : "Unknown";

        // Idempotent webhook handling: organization may already exist.
        if (!message.toLowerCase().includes("duplicate")) {
          throw creationError;
        }
      }

      return NextResponse.json({ message: "User created" }, { status: 201 });
    } catch (err) {
      console.log(err);
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
      console.log("Invitation created", data);

      return NextResponse.json(
        { message: "Invitation created" },
        { status: 201 }
      );
    } catch (err) {
      console.log(err);

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
      console.log("created", data);

      const organizationId = organization?.id;
      const memberId = public_user_data?.user_id;

      if (!organizationId || !memberId) {
        return NextResponse.json({ message: "Missing membership data" }, { status: 400 });
      }

      try {
        await addMemberToCommunity(organizationId, memberId);
      } catch (membershipError) {
        const message =
          membershipError instanceof Error ? membershipError.message : "Unknown";

        // Idempotent webhook handling: member already added in prior event.
        if (!message.toLowerCase().includes("already a member")) {
          throw membershipError;
        }
      }

      return NextResponse.json(
        { message: "Invitation accepted" },
        { status: 201 }
      );
    } catch (err) {
      console.log(err);

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
      console.log("removed", data);

      const organizationId = organization?.id;
      const memberId = public_user_data?.user_id;

      if (!organizationId || !memberId) {
        return NextResponse.json({ message: "Missing membership data" }, { status: 400 });
      }

      try {
        await removeUserFromCommunity(memberId, organizationId);
      } catch (removeError) {
        const message =
          removeError instanceof Error ? removeError.message : "Unknown";

        // Idempotent webhook handling: user/community may already be detached.
        if (
          !message.toLowerCase().includes("user not found") &&
          !message.toLowerCase().includes("community not found")
        ) {
          throw removeError;
        }
      }

      return NextResponse.json({ message: "Member removed" }, { status: 201 });
    } catch (err) {
      console.log(err);

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
      console.log("updated", data);

      if (!id || !name || !slug) {
        return NextResponse.json({ message: "Missing organization update data" }, { status: 400 });
      }

      await updateCommunityInfo(id, name, slug, logo_url || image_url || "");

      return NextResponse.json({ message: "Organization updated" }, { status: 201 });
    } catch (err) {
      console.log(err);

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
      console.log("deleted", data);

      if (!id) {
        return NextResponse.json({ message: "Missing organization id" }, { status: 400 });
      }

      await deleteCommunity(id);

      return NextResponse.json(
        { message: "Organization deleted" },
        { status: 201 }
      );
    } catch (err) {
      console.log(err);

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ message: "Event ignored" }, { status: 200 });
};

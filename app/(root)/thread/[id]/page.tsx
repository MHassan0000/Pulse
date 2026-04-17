import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import Comment from "@/components/forms/Comment";
import PostCard from "@/components/feed/PostCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchThreadById } from "@/lib/actions/thread.actions";

export const revalidate = 0;

type ThreadChild = {
  _id?: unknown;
  parentId?: string | null;
  text?: string;
  author?: {
    name?: string;
    image?: string;
    id?: string;
  };
  community?: {
    id?: string;
    name?: string;
    image?: string;
  } | null;
  createdAt?: string | Date;
  children?: Array<{ author?: { image?: string } }>;
  likes?: unknown[];
  reposts?: unknown[];
  media?: unknown[];
};

type ThreadMedia = {
  kind: "image" | "video";
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  providerKey: string;
};

const toSafeIsoString = (value: unknown) => {
  if (!value) return "";
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const normalizeMedia = (media: unknown): ThreadMedia[] => {
  if (!Array.isArray(media)) return [];

  return media
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
      const url = typeof mediaItem.url === "string" ? mediaItem.url : "";
      const mimeType =
        typeof mediaItem.mimeType === "string" ? mediaItem.mimeType : "";
      const size =
        typeof mediaItem.size === "number"
          ? mediaItem.size
          : Number(mediaItem.size ?? 0);

      if (!kind || !url || !mimeType || !Number.isFinite(size) || size <= 0) {
        return null;
      }

      return {
        kind,
        url,
        mimeType,
        size,
        width: typeof mediaItem.width === "number" ? mediaItem.width : null,
        height: typeof mediaItem.height === "number" ? mediaItem.height : null,
        durationSec:
          typeof mediaItem.durationSec === "number" ? mediaItem.durationSec : null,
        providerKey:
          typeof mediaItem.providerKey === "string" ? mediaItem.providerKey : "",
      };
    })
    .filter((item): item is ThreadMedia => Boolean(item));
};

async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  if (!id) {
    return (
      <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-24 pt-10 md:px-6">
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
          This thread isn&apos;t available.
        </div>
      </section>
    );
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const thread = await fetchThreadById(id);
  if (!thread) {
    return (
      <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-24 pt-10 md:px-6">
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
          This thread isn&apos;t available.
        </div>
      </section>
    );
  }

  const threadId = thread._id ? String(thread._id) : "";
  const threadAuthor = thread.author ?? {};
  const threadCommunity = thread.community ?? null;

  const threadData = {
    id: threadId,
    parentId: thread.parentId ?? null,
    content: thread.text ?? "",
    author: {
      name: threadAuthor.name ?? "Unknown",
      image: threadAuthor.image ?? "",
      id: threadAuthor.id ?? "",
    },
    community: threadCommunity
      ? {
        id: threadCommunity.id ?? "",
        name: threadCommunity.name ?? "",
        image: threadCommunity.image ?? "",
      }
      : null,
    createdAt: thread.createdAt
      ? toSafeIsoString(thread.createdAt)
      : "",
    replyCount: Array.isArray(thread.children) ? thread.children.length : 0,
    likes: Array.isArray(thread.likes)
      ? thread.likes.map((likedBy: unknown) => String(likedBy))
      : [],
    reposts: Array.isArray(thread.reposts)
      ? thread.reposts.map((repostedBy: unknown) => String(repostedBy))
      : [],
    media: normalizeMedia(thread.media),
  };

  return (
    <section className="page-scroll relative mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto px-4 pb-24 pt-10 md:px-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
        <PostCard
          key={`${threadData.id}:${threadData.likes.join("|")}:${threadData.reposts.join("|")}`}
          id={threadData.id}
          currentUserId={user.id}
          parentId={threadData.parentId}
          content={threadData.content}
          author={threadData.author}
          community={threadData.community}
          createdAt={threadData.createdAt}
          replyCount={threadData.replyCount}
          likes={threadData.likes}
          reposts={threadData.reposts}
          media={threadData.media}
        />
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
        <Comment
          threadId={id}
          currentUserImg={user.imageUrl}
          currentUserId={userInfo.id}
        />
      </div>

      <div className="flex flex-col gap-4">
        {(thread.children as ThreadChild[]).map((childItem) => {
          const childAuthor = childItem.author ?? {};
          const childCommunity = childItem.community ?? null;

          return (
            <div
              key={childItem._id ? String(childItem._id) : `${id}-child`}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.35em] text-zinc-400">
                  Reply
                </span>
                <span className="h-px flex-1 bg-linear-to-r from-zinc-200/80 to-transparent dark:from-[#2a2a2a]/80" />
              </div>
              <PostCard
                key={`${childItem._id ? String(childItem._id) : ""}:${Array.isArray(childItem.likes)
                  ? childItem.likes.map((likedBy: unknown) => String(likedBy)).join("|")
                  : ""
                  }:${Array.isArray(childItem.reposts)
                    ? childItem.reposts.map((repostedBy: unknown) => String(repostedBy)).join("|")
                    : ""
                  }`}
                id={childItem._id ? String(childItem._id) : ""}
                currentUserId={user.id}
                parentId={childItem.parentId ?? null}
                content={childItem.text ?? ""}
                author={{
                  name: childAuthor.name ?? "Unknown",
                  image: childAuthor.image ?? "",
                  id: childAuthor.id ?? "",
                }}
                community={
                  childCommunity
                    ? {
                      id: childCommunity.id ?? "",
                      name: childCommunity.name ?? "",
                      image: childCommunity.image ?? "",
                    }
                    : null
                }
                createdAt={
                  childItem.createdAt
                    ? toSafeIsoString(childItem.createdAt)
                    : ""
                }
                replyCount={Array.isArray(childItem.children) ? childItem.children.length : 0}
                likes={
                  Array.isArray(childItem.likes)
                    ? childItem.likes.map((likedBy: unknown) => String(likedBy))
                    : []
                }
                reposts={
                  Array.isArray(childItem.reposts)
                    ? childItem.reposts.map((repostedBy: unknown) => String(repostedBy))
                    : []
                }
                media={normalizeMedia(childItem.media)}
                isComment
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Page

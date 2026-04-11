import { redirect } from "next/navigation";

import { fetchCommunityPosts } from "@/lib/actions/community.actions";
import { fetchUserRepliesReceived } from "@/lib/actions/user.actions";
import { fetchUserPosts } from "@/lib/actions/user.actions";
import PostCard from "@/components/feed/PostCard";

interface Result {
  name: string;
  image: string;
  id: string;
  threads: {
    _id: string;
    text: string;
    parentId: string | null;
    author: {
      name: string;
      image: string;
      id: string;
    };
    community: {
      id: string;
      name: string;
      image: string;
    } | null;
    createdAt: string;
    children: {
      author: {
        image: string;
      };
    }[];
    likes?: string[];
    reposts?: string[];
  }[];
}

type RawThread = {
  _id: unknown;
  text?: string;
  parentId?: string | null;
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
  children?: { author?: { image?: string } }[];
  likes?: unknown[];
  reposts?: unknown[];
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

const toSafeIsoString = (value: string | Date | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

type RawResult = {
  name?: string;
  image?: string;
  id?: string;
  threads?: RawThread[];
  isNext?: boolean;
  totalCount?: number;
};

interface Props {
  currentUserId: string;
  accountId: string;
  accountType: "User" | "Community";
  mode?: "threads" | "replies";
  pageNumber?: number;
  pageSize?: number;
}

async function ThreadsTab({
  currentUserId,
  accountId,
  accountType,
  mode = "threads",
  pageNumber = 1,
  pageSize = 10,
}: Props) {
  let rawResult: RawResult | null;

  if (accountType === "Community") {
    rawResult = (await fetchCommunityPosts(accountId, {
      pageNumber,
      pageSize,
    })) as unknown as RawResult;
  } else {
    rawResult = (
      mode === "replies"
        ? await fetchUserRepliesReceived(accountId, {
            pageNumber,
            pageSize,
          })
        : await fetchUserPosts(accountId, {
            pageNumber,
            pageSize,
          })
    ) as unknown as RawResult;
  }

  if (!rawResult) {
    redirect("/");
  }

  const result: Result = {
    name: rawResult.name ?? "",
    image: rawResult.image ?? "",
    id: rawResult.id ?? "",
    threads: (rawResult.threads ?? []).map((thread) => ({
      _id: toIdString(thread._id),
      text: thread.text ?? "",
      parentId: thread.parentId ? toIdString(thread.parentId) : null,
      author: {
        name: thread.author?.name ?? "Unknown",
        image: thread.author?.image ?? "",
        id: thread.author?.id ?? "",
      },
      community: thread.community
        ? {
            id: thread.community.id ?? "",
            name: thread.community.name ?? "",
            image: thread.community.image ?? "",
          }
        : null,
      createdAt: thread.createdAt
        ? toSafeIsoString(thread.createdAt)
        : "",
      children: (thread.children ?? []).map((child) => ({
        author: {
          image: child.author?.image ?? "",
        },
      })),
      likes: Array.isArray(thread.likes)
        ? thread.likes.map((likedBy) => String(likedBy))
        : [],
      reposts: Array.isArray(thread.reposts)
        ? thread.reposts.map((repostedBy) => String(repostedBy))
        : [],
    })),
  };

  const filteredThreads =
    mode === "replies"
      ? result.threads.filter((thread) => !!thread.parentId)
      : result.threads.filter((thread) => !thread.parentId);

  const isNext = Boolean(rawResult.isNext);

  if (!filteredThreads.length) {
    return {
      content: (
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#111111] dark:text-zinc-400">
          {mode === "replies" ? "No replies yet." : "No threads yet."}
        </div>
      ),
      isNext: false,
    };
  }

  return {
    content: (
      <section className="mt-6 flex flex-col gap-4">
        {filteredThreads.map((thread) => (
          <div
            key={thread._id}
            className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_16px_50px_rgba(0,0,0,0.04)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]"
          >
            <PostCard
              id={thread._id}
              threadLinkId={
                mode === "replies" && thread.parentId
                  ? thread.parentId
                  : thread._id
              }
              currentUserId={currentUserId}
              parentId={thread.parentId}
              content={thread.text}
              author={
                accountType === "User" && mode === "threads"
                  ? { name: result.name, image: result.image, id: result.id }
                  : {
                      name: thread.author.name,
                      image: thread.author.image,
                      id: thread.author.id,
                    }
              }
              community={
                accountType === "Community"
                  ? { name: result.name, id: result.id, image: result.image }
                  : thread.community
              }
              createdAt={thread.createdAt}
              comments={thread.children}
              likes={thread.likes}
              reposts={thread.reposts}
            />
          </div>
        ))}
      </section>
    ),
    isNext,
  };
}

export default ThreadsTab;

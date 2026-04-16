"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import PostCard from "@/components/feed/PostCard";

type RawPost = {
  _id?: unknown;
  id?: string;
  parentId?: string | null;
  text?: string;
  createdAt?: string | Date;
  author?: {
    name?: string;
    image?: string;
    id?: string;
    _id?: { toString?: () => string };
  };
  community?: {
    id?: string;
    name?: string;
    image?: string;
    _id?: { toString?: () => string };
  } | null;
  children?: Array<{ author?: { image?: string } }>;
  likes?: unknown[];
  reposts?: unknown[];
  media?: RawMedia[];
};

type RawMedia = {
  kind?: "image" | "video";
  url?: string;
  mimeType?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  providerKey?: string;
};

type NormalizedMedia = {
  kind: "image" | "video";
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  providerKey: string;
};

type NormalizedPost = {
  id: string;
  parentId: string | null;
  content: string;
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
  comments: Array<{ author: { image: string } }>;
  likes: string[];
  reposts: string[];
  media: NormalizedMedia[];
};

const normalizeMedia = (media: RawMedia[] | undefined): NormalizedMedia[] => {
  if (!Array.isArray(media)) return [];

  return media
    .map((item) => {
      const kind = item.kind === "image" || item.kind === "video" ? item.kind : null;
      const url = typeof item.url === "string" ? item.url : "";
      const mimeType = typeof item.mimeType === "string" ? item.mimeType : "";
      const size = typeof item.size === "number" ? item.size : Number(item.size ?? 0);

      if (!kind || !url || !mimeType || !Number.isFinite(size) || size <= 0) {
        return null;
      }

      return {
        kind,
        url,
        mimeType,
        size,
        width: typeof item.width === "number" ? item.width : null,
        height: typeof item.height === "number" ? item.height : null,
        durationSec: typeof item.durationSec === "number" ? item.durationSec : null,
        providerKey: typeof item.providerKey === "string" ? item.providerKey : "",
      };
    })
    .filter((item): item is NormalizedMedia => Boolean(item));
};

type FeedInfiniteProps = {
  initialPosts: RawPost[];
  initialCursor: string | null;
  hasInitialNext: boolean;
  currentUserId: string;
};

const normalizePost = (post: RawPost): NormalizedPost => {
  const author = post.author ?? {};
  const community = post.community ?? null;
  const createdAt = post.createdAt
    ? (() => {
        const date = new Date(post.createdAt);
        return Number.isNaN(date.getTime()) ? "" : date.toISOString();
      })()
    : "";
  const postId = post._id ? String(post._id) : post.id ? String(post.id) : "";

  return {
    id: postId,
    parentId: post.parentId ?? null,
    content: post.text ?? "",
    author: {
      name: author.name ?? "Unknown",
      image: author.image ?? "",
      id: author.id ?? author._id?.toString?.() ?? "",
    },
    community: community
      ? {
          id: community.id ?? community._id?.toString?.() ?? "",
          name: community.name ?? "",
          image: community.image ?? "",
        }
      : null,
    createdAt,
    comments: Array.isArray(post.children)
      ? post.children.map((child) => ({
          author: {
            image: child?.author?.image ?? "",
          },
        }))
      : [],
    likes: Array.isArray(post.likes) ? post.likes.map((value) => String(value)) : [],
    reposts: Array.isArray(post.reposts)
      ? post.reposts.map((value) => String(value))
      : [],
    media: normalizeMedia(post.media),
  };
};

const FeedInfinite = ({
  initialPosts,
  initialCursor,
  hasInitialNext,
  currentUserId,
}: FeedInfiniteProps) => {
  const [posts, setPosts] = useState<NormalizedPost[]>(() =>
    initialPosts.map(normalizePost)
  );
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasNext, setHasNext] = useState(hasInitialNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const uniquePostIds = useMemo(() => new Set(posts.map((post) => post.id)), [posts]);

  const loadMore = useCallback(async () => {
    if (!hasNext || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (nextCursor) params.set("cursor", nextCursor);
      params.set("limit", "10");

      const response = await fetch(`/api/feed?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load more posts");
      }

      const data = (await response.json()) as {
        posts?: RawPost[];
        nextCursor?: string | null;
        hasNext?: boolean;
      };

      const incoming = Array.isArray(data.posts) ? data.posts.map(normalizePost) : [];
      const filteredIncoming = incoming.filter(
        (post) => post.id && !uniquePostIds.has(post.id)
      );

      setPosts((prev) => [...prev, ...filteredIncoming]);
      setNextCursor(data.nextCursor ?? null);
      setHasNext(Boolean(data.hasNext));
    } catch {
      setError("Could not load more posts right now.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasNext, nextCursor, uniquePostIds]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      {
        root: null,
        rootMargin: "500px 0px 500px 0px",
        threshold: 0,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [loadMore]);

  if (!posts.length) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#111111] dark:text-zinc-400">
        No threads yet. Be the first to post.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 dark:divide-[#2a2a2a]">
      {posts.map((post) => (
        <PostCard
          key={`${post.id}:${post.likes.join("|")}:${post.reposts.join("|")}`}
          id={post.id}
          currentUserId={currentUserId}
          parentId={post.parentId}
          content={post.content}
          author={post.author}
          community={post.community}
          createdAt={post.createdAt}
          comments={post.comments}
          likes={post.likes}
          reposts={post.reposts}
          media={post.media}
        />
      ))}

      <div ref={sentinelRef} className="px-5 py-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-[#1f1f1f] dark:bg-black"
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-xs text-zinc-500">{error}</p>
        ) : !hasNext ? (
          <p className="text-center text-xs text-zinc-500">You&apos;re all caught up.</p>
        ) : null}
      </div>
    </div>
  );
};

export default FeedInfinite;

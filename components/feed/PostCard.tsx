"use client";

import Image from "next/image";
import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  deleteThread,
  toggleLikeThread,
  toggleRepostThread,
} from "@/lib/actions/thread.actions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { memo, useMemo, useState, useTransition } from "react";

type PostCardProps = {
  id: string;
  threadLinkId?: string;
  currentUserId: string;
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
  replyCount?: number;
  likes?: string[];
  reposts?: string[];
  media?: {
    kind: "image" | "video";
    url: string;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    providerKey: string;
  }[];
  isComment?: boolean;
};

type PostMedia = NonNullable<PostCardProps["media"]>[number];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getMediaAspectRatio = (item: PostMedia) => {
  if (
    typeof item.width === "number" &&
    item.width > 0 &&
    typeof item.height === "number" &&
    item.height > 0
  ) {
    return clamp(item.width / item.height, 0.65, 1.95);
  }

  return item.kind === "video" ? 16 / 9 : 4 / 3;
};

const buildMediaSrcCandidates = (item: PostMedia) => {
  const candidates: string[] = [];
  const pushCandidate = (value: string | undefined) => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
  };

  const withAmbiguousVariants = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return [] as string[];

    return Array.from(
      new Set([
        normalized,
        normalized.replace(/I/g, "l"),
        normalized.replace(/l/g, "I"),
      ])
    );
  };

  const publicAppId =
    typeof process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID === "string"
      ? process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID.trim()
      : "";

  let appIdFromUrl = "";
  try {
    const parsed = new URL(item.url);
    const hostMatch = parsed.hostname.match(/^([^.]+)\.ufs\.sh$/i);
    if (hostMatch?.[1]) {
      appIdFromUrl = hostMatch[1];
    } else if (parsed.hostname === "ufs.sh") {
      const pathAppId = parsed.pathname.match(/^\/f\/([^/]+)/)?.[1] ?? "";
      appIdFromUrl = pathAppId;
    }
  } catch {
    appIdFromUrl = "";
  }

  const keyFromUrl = item.url.match(/\/f\/([^/?#]+)/)?.[1] ?? "";
  const providerKey = item.providerKey?.trim() || "";
  const resolvedAppId = appIdFromUrl || publicAppId;

  const keyCandidates = Array.from(
    new Set([
      ...withAmbiguousVariants(providerKey),
      ...withAmbiguousVariants(keyFromUrl),
    ])
  );

  if (resolvedAppId) {
    for (const key of keyCandidates) {
      pushCandidate(`https://${resolvedAppId}.ufs.sh/f/${key}`);
    }
  }

  pushCandidate(item.url);

  return candidates;
};

const PostMediaImage = ({ item, singleMedia }: { item: PostMedia; singleMedia: boolean }) => {
  const srcCandidates = useMemo(() => buildMediaSrcCandidates(item), [item]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const src = srcCandidates[candidateIndex] ?? item.url;
  const aspectRatio = getMediaAspectRatio(item);

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={`group relative block w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-[#1f1f1f] dark:bg-black ${
        singleMedia ? "col-span-full mx-auto max-w-230" : ""
      }`}
    >
      <div
        className={`relative w-full ${
          singleMedia ? "min-h-65 max-h-190" : "min-h-47.5 max-h-105"
        }`}
        style={{ aspectRatio: String(aspectRatio) }}
      >
        {imageFailed ? (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-center text-xs text-zinc-500 dark:bg-[#090909] dark:text-zinc-400">
            Image preview unavailable
          </div>
        ) : (
          <Image
            src={src}
            alt="Thread media"
            fill
            unoptimized
            sizes={
              singleMedia
                ? "(max-width: 768px) calc(100vw - 4rem), (max-width: 1200px) 86vw, 920px"
                : "(max-width: 768px) calc(100vw - 4rem), 420px"
            }
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            onError={() => {
              setCandidateIndex((index) => {
                if (index < srcCandidates.length - 1) {
                  return index + 1;
                }

                setImageFailed(true);
                return index;
              });
            }}
          />
        )}
      </div>
    </a>
  );
};

const PostCard = ({
  id,
  threadLinkId,
  author,
  currentUserId,
  community,
  createdAt,
  content,
  replyCount = 0,
  likes = [],
  reposts = [],
  media = [],
  isComment,
}: PostCardProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isLikePending, startLikeTransition] = useTransition();
  const [isRepostPending, startRepostTransition] = useTransition();
  const [likeIds, setLikeIds] = useState<string[]>(() => likes);
  const [repostIds, setRepostIds] = useState<string[]>(() => reposts);

  const safeReplyCount =
    typeof replyCount === "number" && Number.isFinite(replyCount) && replyCount >= 0
      ? Math.floor(replyCount)
      : 0;
  const stats = {
    likes: likeIds.length,
    replies: safeReplyCount,
    reposts: repostIds.length,
  };

  const formattedDate = createdAt
    ? (() => {
        const date = new Date(createdAt);
        return Number.isNaN(date.getTime())
          ? ""
          : date.toISOString().slice(0, 16).replace("T", " ");
      })()
    : "";

  const likedByCurrentUser = likeIds.includes(currentUserId);
  const repostedByCurrentUser = repostIds.includes(currentUserId);

  const canDelete = currentUserId === author.id;
  const targetThreadId = threadLinkId || id;
  const singleMedia = media.length === 1;

  const handleDelete = async () => {
    if (!canDelete) return;
    await deleteThread(id, pathname, currentUserId);

    if (!isComment && pathname.startsWith("/thread/")) {
      router.replace("/");
      return;
    }

    router.refresh();
  };

  const handleLike = () => {
    if (!currentUserId) {
      router.push(`/sign-up?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isLikePending) return;

    const previous = likeIds;
    const next = previous.includes(currentUserId)
      ? previous.filter((idValue) => idValue !== currentUserId)
      : [...previous, currentUserId];

    setLikeIds(next);

    startLikeTransition(async () => {

      try {
        const result = await toggleLikeThread(id, currentUserId, pathname);
        setLikeIds((state) => {
          const hasLike = state.includes(currentUserId);
          if (result.liked === hasLike) {
            return state;
          }

          return result.liked
            ? [...state, currentUserId]
            : state.filter((idValue) => idValue !== currentUserId);
        });
      } catch {
        setLikeIds(previous);
      }
    });
  };

  const handleRepost = () => {
    if (!currentUserId) {
      router.push(`/sign-up?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isRepostPending) return;

    const previous = repostIds;
    const next = previous.includes(currentUserId)
      ? previous.filter((idValue) => idValue !== currentUserId)
      : [...previous, currentUserId];

    setRepostIds(next);

    startRepostTransition(async () => {

      try {
        const result = await toggleRepostThread(id, currentUserId, pathname);
        setRepostIds((state) => {
          const hasRepost = state.includes(currentUserId);
          if (result.reposted === hasRepost) {
            return state;
          }

          return result.reposted
            ? [...state, currentUserId]
            : state.filter((idValue) => idValue !== currentUserId);
        });
      } catch {
        setRepostIds(previous);
      }
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-transparent px-5 py-5"
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${author.id}`}
          className="h-11 w-11 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 transition-transform duration-200 hover:scale-[1.02] dark:border-[#2a2a2a] dark:bg-black"
        >
          {author.image ? (
            <Image
              src={author.image}
              alt={`${author.name} profile`}
              width={44}
              height={44}
              className="h-full w-full object-cover"
            />
          ) : null}
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${author.id}`}
                className="text-sm font-semibold text-zinc-900 transition-colors hover:text-zinc-700 dark:text-white dark:hover:text-zinc-200"
              >
                {author.name}
              </Link>
              {createdAt ? (
                <span className="text-xs text-zinc-500">
                  {formattedDate}
                </span>
              ) : null}
            </div>
            {canDelete ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer text-zinc-500 transition-all duration-200 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isComment ? "Delete comment" : "Delete thread"}
                    </DialogTitle>
                    <DialogDescription>
                      {isComment
                        ? "This will permanently remove your comment."
                        : "This will permanently remove your thread and its replies."}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="destructive" onClick={handleDelete}>
                        Delete
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
          <Link
            href={`/thread/${targetThreadId}`}
            className="mt-2 block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-700"
          >
            <div className="text-sm text-zinc-700 transition-colors duration-200 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white">
              <ReactMarkdown
                className="markdown-content"
                remarkPlugins={[remarkGfm]}
                skipHtml
                allowedElements={[
                  "p",
                  "br",
                  "strong",
                  "em",
                  "del",
                  "blockquote",
                  "code",
                  "pre",
                  "ul",
                  "ol",
                  "li",
                  "hr",
                  "a",
                  "h1",
                  "h2",
                  "h3",
                  "h4",
                ]}
                components={{
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      className="markdown-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </Link>

          {media.length ? (
            <div className="mt-3 -ml-7 w-full">
              <div
                className={`mx-auto grid w-full max-w-230 gap-2 ${
                  singleMedia ? "grid-cols-1 justify-items-center" : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {media.map((item, index) =>
                  item.kind === "image" ? (
                    <PostMediaImage
                      key={`${item.providerKey || item.url}-${index}`}
                      item={item}
                      singleMedia={singleMedia}
                    />
                  ) : (
                    <div
                      key={`${item.providerKey || item.url}-${index}`}
                      className={`w-full overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-[#1f1f1f] ${
                        singleMedia ? "col-span-full mx-auto max-w-230" : ""
                      }`}
                    >
                    <div
                      className={`relative w-full ${
                        singleMedia ? "min-h-65 max-h-190" : "min-h-47.5 max-h-105"
                      }`}
                      style={{ aspectRatio: String(getMediaAspectRatio(item)) }}
                    >
                      <video
                        src={item.url}
                        controls
                        preload="metadata"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  )
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-6 text-xs text-zinc-500">
            <button
              type="button"
              onClick={handleLike}
              disabled={isLikePending}
              className={`cursor-pointer flex items-center gap-2 transition-all duration-200 ${
                likedByCurrentUser
                  ? "text-red-500"
                  : "hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${likedByCurrentUser ? "fill-current" : ""}`}
              />
              {stats.likes}
            </button>
            <button
              type="button"
              className="cursor-pointer flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              {stats.replies}
            </button>
            <button
              type="button"
              onClick={handleRepost}
              disabled={isRepostPending}
              className={`cursor-pointer flex items-center gap-2 transition-all duration-200 ${
                repostedByCurrentUser
                  ? "text-emerald-500"
                  : "hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Repeat2 className="h-4 w-4" />
              {stats.reposts}
            </button>
          </div>

          {community ? (
            <Link
              href={`/communities/${community.id}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <span className="h-4 w-4 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
                {community.image ? (
                  <Image
                    src={community.image}
                    alt={`${community.name} avatar`}
                    width={16}
                    height={16}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </span>
              <span>Posted in {community.name}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

const MemoizedPostCard = memo(PostCard);
MemoizedPostCard.displayName = "PostCard";

export default MemoizedPostCard;

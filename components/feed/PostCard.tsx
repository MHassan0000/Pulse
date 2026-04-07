"use client";

import Image from "next/image";
import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useOptimistic, useTransition } from "react";

type PostCardProps = {
  id: string;
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
  comments: {
    author: {
      image: string;
    };
  }[];
  likes?: string[];
  reposts?: string[];
  isComment?: boolean;
};

const PostCard = ({
  id,
  author,
  currentUserId,
  createdAt,
  content,
  comments,
  likes = [],
  reposts = [],
  isComment,
}: PostCardProps) => {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    likes,
    (state, userId: string) =>
      state.includes(userId)
        ? state.filter((id) => id !== userId)
        : [...state, userId]
  );

  const [optimisticReposts, setOptimisticReposts] = useOptimistic(
    reposts,
    (state, userId: string) =>
      state.includes(userId)
        ? state.filter((id) => id !== userId)
        : [...state, userId]
  );

  const replyCount = comments?.length ?? 0;
  const stats = {
    likes: optimisticLikes.length,
    replies: replyCount,
    reposts: optimisticReposts.length,
  };

  const likedByCurrentUser = optimisticLikes.includes(currentUserId);
  const repostedByCurrentUser = optimisticReposts.includes(currentUserId);

  const canDelete = currentUserId === author.id;
  const handleDelete = async () => {
    if (!canDelete) return;
    await deleteThread(id, pathname);
  };

  const handleLike = () => {
    if (!currentUserId || isPending) return;
    startTransition(async () => {
      setOptimisticLikes(currentUserId);
      await toggleLikeThread(id, currentUserId, pathname);
    });
  };

  const handleRepost = () => {
    if (!currentUserId || isPending) return;
    startTransition(async () => {
      setOptimisticReposts(currentUserId);
      await toggleRepostThread(id, currentUserId, pathname);
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
                  {createdAt}
                </span>
              ) : null}
            </div>
            {canDelete ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-zinc-500 transition-all duration-200 hover:text-zinc-700 dark:hover:text-zinc-300"
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
            href={`/thread/${id}`}
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
          <div className="mt-4 flex items-center gap-6 text-xs text-zinc-500">
            <button
              type="button"
              onClick={handleLike}
              disabled={isPending}
              className={`flex items-center gap-2 transition-all duration-200 ${
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
              className="flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              {stats.replies}
            </button>
            <button
              type="button"
              onClick={handleRepost}
              disabled={isPending}
              className={`flex items-center gap-2 transition-all duration-200 ${
                repostedByCurrentUser
                  ? "text-emerald-500"
                  : "hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Repeat2 className="h-4 w-4" />
              {stats.reposts}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default PostCard;

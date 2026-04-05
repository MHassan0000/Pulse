"use client";

import Image from "next/image";
import type { SyntheticEvent } from "react";
import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  isComment?: boolean;
};

const PostCard = ({
  id,
  author,
  createdAt,
  content,
  comments,
}: PostCardProps) => {
  const router = useRouter();
  const replyCount = comments?.length ?? 0;
  const stats = {
    likes: 0,
    replies: replyCount,
    reposts: 0,
  };

  const handleThreadOpen = () => {
    router.push(`/thread/${id}`);
  };

  const stopClick = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                {author.name}
              </span>
              {createdAt ? (
                <span className="text-xs text-zinc-500">
                  {createdAt}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(event) => stopClick(event)}
              onMouseDown={(event) => stopClick(event)}
              onTouchStart={(event) => stopClick(event)}
              className="text-zinc-500 transition-all duration-200 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={handleThreadOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleThreadOpen();
              }
            }}
            className="mt-2 cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-700"
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
          </div>
          <div className="mt-4 flex items-center gap-6 text-xs text-zinc-500">
            <button
              type="button"
              onClick={(event) => stopClick(event)}
              onMouseDown={(event) => stopClick(event)}
              onTouchStart={(event) => stopClick(event)}
              className="flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white"
            >
              <Heart className="h-4 w-4" />
              {stats.likes}
            </button>
            <button
              type="button"
              onClick={(event) => stopClick(event)}
              onMouseDown={(event) => stopClick(event)}
              onTouchStart={(event) => stopClick(event)}
              className="flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              {stats.replies}
            </button>
            <button
              type="button"
              onClick={(event) => stopClick(event)}
              onMouseDown={(event) => stopClick(event)}
              onTouchStart={(event) => stopClick(event)}
              className="flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white"
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

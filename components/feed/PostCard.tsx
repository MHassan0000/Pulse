"use client";

import Image from "next/image";
import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

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
  author,
  createdAt,
  content,
  comments,
}: PostCardProps) => {
  const stats = {
    likes: 0,
    replies: comments?.length ?? 0,
    reposts: 0,
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-transparent px-5 py-5"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
          {author.image ? (
            <Link href={`/profile/${author.id}`}>

              <Image
                src={author.image}
                alt={`${author.name} profile`}
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            </Link>
          ) : null}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{author.name}</p>
              {createdAt ? (
                <span className="text-xs text-zinc-500">
                  {new Date(createdAt).toLocaleString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : null}
            </div>
            <button className="text-zinc-500 transition-all duration-200 hover:text-zinc-700 dark:hover:text-zinc-300">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
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
          <div className="mt-4 flex items-center gap-6 text-xs text-zinc-500">
            <button className="flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white">
              <Heart className="h-4 w-4" />
              {stats.likes}
            </button>
            <button className="flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white">
              <MessageCircle className="h-4 w-4" />
              {stats.replies}
            </button>
            <button className="flex items-center gap-2 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white">
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

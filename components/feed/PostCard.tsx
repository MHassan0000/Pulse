"use client";

import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";

type PostCardProps = {
  author: string;
  handle: string;
  time: string;
  content: string;
  credit?: string;
  stats: {
    likes: number;
    replies: number;
    reposts: number;
  };
  showMedia?: boolean;
};

const PostCard = ({
  author,
  handle,
  time,
  content,
  credit,
  stats,
  showMedia,
}: PostCardProps) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-transparent px-5 py-5"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{author}</p>
              <span className="text-xs text-zinc-500">{time}</span>
            </div>
            <button className="text-zinc-500 transition-all duration-200 hover:text-zinc-700 dark:hover:text-zinc-300">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{content}</p>
          {credit ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{credit}</p>
          ) : null}
          {showMedia ? (
            <div className="mt-4 h-72 rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-200 via-white to-zinc-100 dark:border-[#1f1f1f] dark:from-zinc-900 dark:via-black dark:to-zinc-800" />
          ) : null}
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

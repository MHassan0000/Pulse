"use client";

import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";

type PostCardProps = {
  author: string;
  handle: string;
  time: string;
  content: string;
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
  stats,
  showMedia,
}: PostCardProps) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-zinc-800" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{author}</p>
            <span className="text-xs text-zinc-500">{handle}</span>
            <span className="text-xs text-zinc-500">{time}</span>
          </div>
          <p className="mt-2 text-sm text-zinc-200">{content}</p>
          {showMedia ? (
            <div className="mt-4 h-64 rounded-xl border border-[#1f1f1f] bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
          ) : null}
          <div className="mt-4 flex items-center gap-6 text-xs text-zinc-500">
            <button className="flex items-center gap-2 transition-all duration-200 hover:text-white">
              <Heart className="h-4 w-4" />
              {stats.likes}
            </button>
            <button className="flex items-center gap-2 transition-all duration-200 hover:text-white">
              <MessageCircle className="h-4 w-4" />
              {stats.replies}
            </button>
            <button className="flex items-center gap-2 transition-all duration-200 hover:text-white">
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

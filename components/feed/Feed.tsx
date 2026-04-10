import Link from "next/link";
import PostCard from "@/components/feed/PostCard";
import { fetchPosts } from "@/lib/actions/thread.actions";

type FeedProps = {
  pageNumber?: number;
  pageSize?: number;
  currentUserId?: string | null;
};

type FeedPost = {
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
};

const Feed = async ({
  pageNumber = 1,
  pageSize = 10,
  currentUserId,
}: FeedProps) => {
  let posts: FeedPost[] = [];
  let isNext = false;

  try {
    const result = await fetchPosts(pageNumber, pageSize);
    posts = result.posts as FeedPost[];
    isNext = result.isNext;
  } catch (error) {
    console.error("Feed fetch failed:", error);
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#111111] dark:text-zinc-400">
        Feed is temporarily unavailable. Please refresh in a moment.
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#111111] dark:text-zinc-400">
        No threads yet. Be the first to post.
      </div>
    );
  }

  const sanitizedPosts = posts.map((post: FeedPost) => {
    const author = post.author ?? {};
    const community = post.community ?? null;
    const createdAt = post.createdAt
      ? new Date(post.createdAt).toISOString()
      : undefined;

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
      createdAt: createdAt ?? "",
      comments: Array.isArray(post.children)
        ? post.children.map((child) => ({
            author: {
              image: child?.author?.image ?? "",
            },
          }))
        : [],
      likes: Array.isArray(post.likes)
        ? post.likes.map((likedBy: unknown) => String(likedBy))
        : [],
      reposts: Array.isArray(post.reposts)
        ? post.reposts.map((repostedBy: unknown) => String(repostedBy))
        : [],
    };
  });

  return (
    <div className="divide-y divide-zinc-200 dark:divide-[#2a2a2a]">
      {sanitizedPosts.map((post) => (
        <PostCard
          key={post.id}
          id={post.id}
          currentUserId={currentUserId ?? ""}
          parentId={post.parentId}
          content={post.content}
          author={post.author}
          community={post.community}
          createdAt={post.createdAt}
          comments={post.comments}
          likes={post.likes}
          reposts={post.reposts}
        />
      ))}
      <div className="flex items-center justify-between px-5 py-6 text-xs text-zinc-500">
        <span>Page {pageNumber}</span>
        <div className="flex items-center gap-3">
          {pageNumber > 1 ? (
            <Link
              className="rounded-full border border-zinc-200 px-3 py-1 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-[#1f1f1f] dark:hover:border-zinc-700 dark:hover:text-zinc-300"
              href={`/?page=${pageNumber - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {isNext ? (
            <Link
              className="rounded-full border border-zinc-200 px-3 py-1 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-[#1f1f1f] dark:hover:border-zinc-700 dark:hover:text-zinc-300"
              href={`/?page=${pageNumber + 1}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Feed;

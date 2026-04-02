import PostCard from "@/components/feed/PostCard";
import { posts } from "@/constants";



const Feed = () => {
  return (
    <div className="divide-y divide-zinc-200 dark:divide-[#2a2a2a]">
      {posts.map((post) => (
        <PostCard key={post.id} {...post} />
      ))}
    </div>
  );
};

export default Feed;

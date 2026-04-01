import PostCard from "@/components/feed/PostCard";

const posts = [
  {
    id: "post-1",
    author: "visitpham",
    handle: "@visitpham",
    time: "15h",
    content: "Is a museum date the best first date, or are we biased?",
    stats: {
      likes: 101,
      replies: 14,
      reposts: 4,
    },
    showMedia: false,
  },
  {
    id: "post-2",
    author: "fcbayern",
    handle: "@fcbayern",
    time: "11h",
    content: "Olise just hits different. The build-up was elite.",
    stats: {
      likes: 842,
      replies: 128,
      reposts: 22,
    },
    showMedia: true,
  },
  {
    id: "post-3",
    author: "lunarwave",
    handle: "@lunarwave",
    time: "2h",
    content: "Minimal, premium, and calm. Shipping the new ambient feed tonight.",
    stats: {
      likes: 312,
      replies: 34,
      reposts: 9,
    },
    showMedia: false,
  },
];

const Feed = () => {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} {...post} />
      ))}
    </div>
  );
};

export default Feed;

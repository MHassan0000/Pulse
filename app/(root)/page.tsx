import Feed from "@/components/feed/Feed";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Home
          </p>
          <h1 className="text-lg font-semibold text-white">Latest Threads</h1>
        </div>
        <button className="rounded-full border border-[#1f1f1f] px-4 py-2 text-xs text-zinc-300 transition-all duration-200 hover:bg-zinc-900">
          New Post
        </button>
      </div>
      <section className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a]/80 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-800" />
          <div className="flex-1">
            <p className="text-sm text-zinc-400">Share your thoughts...</p>
          </div>
        </div>
      </section>
      <section>
        <Feed />
      </section>
    </div>
  );
}

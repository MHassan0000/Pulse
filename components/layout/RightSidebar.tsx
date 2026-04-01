const RightSidebar = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
        <h3 className="text-sm font-semibold text-white">Suggested users</h3>
        <div className="mt-4 space-y-3">
          {[
            { name: "visitpham", tag: "@visitpham" },
            { name: "fcbayern", tag: "@fcbayern" },
            { name: "lunarwave", tag: "@lunarwave" },
          ].map((user) => (
            <div
              key={user.tag}
              className="flex items-center justify-between rounded-xl border border-[#1f1f1f] bg-black/40 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-zinc-800" />
                <div>
                  <p className="text-sm text-white">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.tag}</p>
                </div>
              </div>
              <button className="rounded-full border border-[#1f1f1f] px-3 py-1 text-xs text-zinc-300 transition-all duration-200 hover:bg-zinc-900">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
        <h3 className="text-sm font-semibold text-white">Welcome back</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Log in or sign up to follow creators and join the conversation.
        </p>
        <button className="mt-4 w-full rounded-xl border border-[#1f1f1f] bg-black/60 px-4 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-900">
          Continue with Instagram
        </button>
        <button className="mt-3 w-full rounded-xl border border-transparent bg-transparent px-4 py-2 text-xs text-zinc-500 transition-all duration-200 hover:text-zinc-200">
          Log in with username instead
        </button>
      </div>
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
        <h3 className="text-sm font-semibold text-white">Trending topics</h3>
        <div className="mt-4 space-y-3">
          {[
            "Design systems",
            "UCL highlights",
            "Indie launches",
            "Studio moodboards",
          ].map((topic) => (
            <div
              key={topic}
              className="rounded-xl border border-[#1f1f1f] bg-black/40 px-3 py-2"
            >
              <p className="text-sm text-white">{topic}</p>
              <p className="text-xs text-zinc-500">Trending now</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;

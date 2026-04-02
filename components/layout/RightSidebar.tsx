const RightSidebar = () => {
  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto px-2 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-[#1f1f1f] dark:bg-[#1a1a1a]">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Log in or sign up for Threads
        </h3>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          See what people are talking about and join the conversation.
        </p>
        <button className="mt-6 w-full rounded-2xl border border-zinc-200 bg-zinc-900 px-4 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-black dark:border-[#1f1f1f] dark:bg-black/70 dark:text-zinc-100 dark:hover:bg-zinc-900">
          Continue with Instagram
        </button>
        <button className="mt-4 w-full rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm text-zinc-500 transition-all duration-200 hover:text-zinc-900 dark:hover:text-zinc-200">
          Log in with username instead
        </button>
      </div>
      <div className="text-center text-xs text-zinc-500">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span>© 2026</span>
          <span>Threads Terms</span>
          <span>Privacy Policy</span>
          <span>Cookies Policy</span>
        </div>
        <p className="mt-2">Report a problem</p>
      </div>
    </div>
  );
};

export default RightSidebar;

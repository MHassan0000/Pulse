import Feed from "@/components/feed/Feed";

export default function Home() {
  return (
    <div className="flex h-full w-full flex-col min-h-0">
      <div className="flex-1 min-h-0 rounded-3xl border border-zinc-200 bg-white dark:border-[#1f1f1f] dark:bg-[#111111]">
        <div className="h-full overflow-y-auto pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Feed />
        </div>
      </div>
    </div>
  );
}

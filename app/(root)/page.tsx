import Feed from "@/components/feed/Feed";

export default function Home() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 rounded-3xl border border-zinc-200 bg-white dark:border-[#1f1f1f] dark:bg-[#111111]">
        <div className="h-full overflow-y-auto pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Feed />
        </div>
      </div>
    </div>
  );
}

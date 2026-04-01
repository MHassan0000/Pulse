import Feed from "@/components/feed/Feed";

export default function Home() {
  return (
    <div className="mx-auto flex w-150 max-w-250 flex-col gap-3">
      <div className="rounded-3xl border border-[#1f1f1f] bg-[#111111]">
        <div className="max-h-[calc(100vh-7.5rem)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Feed />
        </div>
      </div>
    </div>
  );
}

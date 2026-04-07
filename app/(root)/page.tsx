import Feed from "@/components/feed/Feed";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchUser } from "@/lib/actions/user.actions";

type HomeProps = {
  searchParams?: {
    page?: string;
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: HomeProps) {
  const { userId } = await auth();
  const userInfo = userId ? await fetchUser(userId) : null;

  if (userId) {
    if (!userInfo?.onboarded) {
      redirect("/onboarding");
    }
  }

  const pageNumber = Number(searchParams?.page ?? 1);
  const safePageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  return (
    <div className="flex h-full w-full flex-col min-h-0">
      <div className="flex-1 min-h-0 rounded-3xl border border-zinc-200 bg-white dark:border-[#1f1f1f] dark:bg-[#111111]">
        <div className="h-full overflow-y-auto pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Feed
            pageNumber={safePageNumber}
            pageSize={10}
            currentUserId={userId ?? ""}
          />
        </div>
      </div>
    </div>
  );
}

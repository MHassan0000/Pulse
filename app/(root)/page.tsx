import Feed from "@/components/feed/Feed";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchUser } from "@/lib/actions/user.actions";

type HomeProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: HomeProps) {
  try {
    const { userId } = await auth();
    const userInfo = userId ? await fetchUser(userId) : null;

    if (userId) {
      if (!userInfo?.onboarded) {
        redirect("/onboarding");
      }
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const pageNumber = Number(resolvedSearchParams?.page ?? 1);
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
  } catch {
    return (
      <section className="page-scroll h-full overflow-y-auto pb-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
            We couldn't load the feed right now.
          </div>
        </div>
      </section>
    );
  }
}

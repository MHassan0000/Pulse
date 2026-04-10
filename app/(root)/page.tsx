import Feed from "@/components/feed/Feed";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, unstable_rethrow } from "next/navigation";
import { ensureUserFromClerk, fetchUser } from "@/lib/actions/user.actions";

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

    let userInfo = null;
    let userLookupFailed = false;

    if (userId) {
      try {
        userInfo = await fetchUser(userId);
      } catch (error) {
        userLookupFailed = true;
        console.error("Home user lookup failed:", error);
      }

      if (!userInfo && !userLookupFailed) {
        const clerkUser = await currentUser();
        if (clerkUser) {
          try {
            const fullName = [clerkUser.firstName ?? "", clerkUser.lastName ?? ""]
              .join(" ")
              .trim();

            await ensureUserFromClerk({
              userId: clerkUser.id,
              username: clerkUser.username,
              name: fullName || clerkUser.username || "New User",
              image: clerkUser.imageUrl,
            });

            userInfo = await fetchUser(userId);
          } catch (error) {
            userLookupFailed = true;
            console.error("Home user bootstrap failed:", error);
          }
        }
      }
    }

    if (userId) {
      if (userLookupFailed) {
        return (
          <section className="page-scroll h-full overflow-y-auto pb-24">
            <div className="mx-auto flex w-full max-w-3xl flex-col">
              <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
                We are connecting your account. Please refresh in a few seconds.
              </div>
            </div>
          </section>
        );
      }

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
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "Unknown";
    console.error("Home render failed:", message);
    return (
      <section className="page-scroll h-full overflow-y-auto pb-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
            No threads yet. Be the first to post.
          </div>
        </div>
      </section>
    );
  }
}

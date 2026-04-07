import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import Searchbar from "@/components/search/Searchbar";
import Pagination from "@/components/layout/Pagination";
import CommunityCard from "@/components/community/CommunityCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchCommunities } from "@/lib/actions/community.actions";

async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const pageNumber = resolvedSearchParams?.page ? +resolvedSearchParams.page : 1;
  const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  const result = await fetchCommunities({
    searchString: resolvedSearchParams.q,
    pageNumber: normalizedPageNumber,
    pageSize: 25,
  });

  return (
    <section className="page-scroll h-full overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Network</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Communities
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Discover communities and join conversations that matter to you.
            </p>
          </div>

          <Searchbar routeType="communities" />

          <section className="mt-8 flex flex-wrap gap-4">
            {result.communities.length === 0 ? (
              <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                No result found.
              </div>
            ) : (
              result.communities.map((community) => (
                <CommunityCard
                  key={community.id}
                  id={community.id}
                  name={community.name}
                  username={community.username}
                  imgUrl={community.image}
                  bio={community.bio}
                  members={community.members}
                />
              ))
            )}
          </section>

          <Pagination
            path="communities"
            pageNumber={normalizedPageNumber}
            isNext={result.isNext}
          />
        </div>
      </div>
    </section>
  );
}

export default Page;

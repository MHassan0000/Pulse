import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import Searchbar from "@/components/search/Searchbar";
import SearchResults from "./SearchResults";

import { fetchUser } from "@/lib/actions/user.actions";

async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  try {
    const resolvedSearchParams = await searchParams;

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const userInfo = await fetchUser(user.id);
    if (!userInfo?.onboarded) redirect("/onboarding");

    const pageNumber = resolvedSearchParams?.page ? +resolvedSearchParams.page : 1;
    const normalizedPageNumber = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;

    return (
      <section className="page-scroll h-full overflow-y-auto pb-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-8">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Discover</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Search users
              </h1>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Find people by name or username and jump into their profile.
              </p>
            </div>

            <Searchbar routeType="search" />

            <Suspense
              key={`${resolvedSearchParams.q ?? ""}-${normalizedPageNumber}`}
              fallback={
                <div className="mt-8 flex flex-col gap-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-[#1f1f1f] dark:bg-black"
                    />
                  ))}
                </div>
              }
            >
              <SearchResults
                userId={user.id}
                query={resolvedSearchParams.q}
                pageNumber={normalizedPageNumber}
              />
            </Suspense>
          </div>
        </div>
      </section>
    );
  } catch {
    return (
      <section className="page-scroll h-full overflow-y-auto pb-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
            We couldn&apos;t load search right now.
          </div>
        </div>
      </section>
    );
  }
}

export default Page;

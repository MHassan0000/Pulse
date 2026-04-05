import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import UserCard from "@/components/search/UserCard";
import Searchbar from "@/components/search/Searchbar";
import Pagination from "@/components/search/Pagination";

import { fetchUser, fetchUsers } from "@/lib/actions/user.actions";

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

  const result = await fetchUsers({
    userId: user.id,
    searchString: resolvedSearchParams.q,
    pageNumber,
    pageSize: 25,
  });

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

          <div className="mt-8 flex flex-col gap-4">
            {result.users.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                No result found.
              </div>
            ) : (
              result.users.map((person) => (
                <UserCard
                  key={person.id}
                  id={person.id}
                  name={person.name}
                  username={person.username}
                  imgUrl={person.image}
                  personType="User"
                />
              ))
            )}
          </div>

          <Pagination path="search" pageNumber={pageNumber} isNext={result.isNext} />
        </div>
      </div>
    </section>
  );
}

export default Page;

import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { profileTabs } from "@/constants";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabPanel from "@/components/profile/ProfileTabPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { fetchUser, fetchUserStats } from "@/lib/actions/user.actions";

type ProfileSearchParams = {
  tab?: string;
  threadsPage?: string;
  repliesPage?: string;
};

const resolvePositivePage = (value: string | undefined) => {
  const pageNumber = Number(value ?? 1);
  return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
};

async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<ProfileSearchParams>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userInfo = await fetchUser(id);
  if (!userInfo) redirect("/");
  if (!userInfo?.onboarded) redirect("/onboarding");

  const userStats = await fetchUserStats(userInfo.id);

  const profilePathname = `/profile/${id}`;
  const activeTab =
    resolvedSearchParams?.tab === "threads" ||
    resolvedSearchParams?.tab === "replies" ||
    resolvedSearchParams?.tab === "media"
      ? resolvedSearchParams.tab
      : "threads";
  const threadsPage = resolvePositivePage(resolvedSearchParams?.threadsPage);
  const repliesPage = resolvePositivePage(resolvedSearchParams?.repliesPage);

  const tabHref = (tabValue: "threads" | "replies" | "media") => {
    const paramsValue = new URLSearchParams();
    paramsValue.set("tab", tabValue);

    if (tabValue === "threads" && threadsPage > 1) {
      paramsValue.set("threadsPage", String(threadsPage));
    }

    if (tabValue === "replies" && repliesPage > 1) {
      paramsValue.set("repliesPage", String(repliesPage));
    }

    if (tabValue !== "threads" && threadsPage > 1) {
      paramsValue.set("threadsPage", String(threadsPage));
    }

    if (tabValue !== "replies" && repliesPage > 1) {
      paramsValue.set("repliesPage", String(repliesPage));
    }

    const query = paramsValue.toString();
    return query ? `${profilePathname}?${query}` : profilePathname;
  };

  const threadCount = userStats.threadCount;
  const replyCount = userStats.replyCount;

  return (
    <section className="page-scroll h-full overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <ProfileHeader
          accountId={userInfo.id}
          authUserId={user.id}
          name={userInfo.name}
          username={userInfo.username}
          imgUrl={userInfo.image}
          bio={userInfo.bio}
        />

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-6">
          <Tabs value={activeTab} className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-[#1f1f1f] dark:bg-black"
            >
              {profileTabs.map((tab) => (
                <TabsTrigger
                  key={tab.label}
                  asChild
                  value={tab.value}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  <Link href={tabHref(tab.value as "threads" | "replies" | "media")}>
                    <span>{tab.label}</span>
                    {tab.label === "Threads" ? (
                      <span className="ml-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {threadCount}
                      </span>
                    ) : tab.label === "Replies" ? (
                      <span className="ml-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {replyCount}
                      </span>
                    ) : null}
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="threads" className="w-full">
              {activeTab === "threads" ? (
                <ProfileTabPanel
                  currentUserId={user.id}
                  accountId={userInfo.id}
                  mode="threads"
                  pageNumber={threadsPage}
                  pageSize={10}
                  path={profilePathname}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="replies" className="w-full">
              {activeTab === "replies" ? (
                <ProfileTabPanel
                  currentUserId={user.id}
                  accountId={userInfo.id}
                  mode="replies"
                  pageNumber={repliesPage}
                  pageSize={10}
                  path={profilePathname}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="media" className="w-full">
              {activeTab === "media" ? (
                <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                  Media will be available soon.
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

export default Page;

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { profileTabs } from "@/constants";
import ThreadsTab from "@/components/profile/ThreadsTab";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { fetchUser, fetchUserPosts, fetchUserStats } from "@/lib/actions/user.actions";

type ProfileThread = {
  _id?: { toString?: () => string } | string | number;
  parentId?: string | null;
};

const threadIdToString = (value: ProfileThread["_id"]) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return value?.toString?.() ?? "";
};

async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userInfo = await fetchUser(id);
  if (!userInfo) redirect("/");
  if (!userInfo?.onboarded) redirect("/onboarding");

  const [postsData, userStats] = await Promise.all([
    fetchUserPosts(userInfo.id),
    fetchUserStats(userInfo.id),
  ]);
  const rawThreads = Array.isArray(postsData?.threads)
    ? (postsData.threads as ProfileThread[])
    : [];

  const uniqueThreads = Array.from(
    new Map(
      rawThreads.map((thread) => [
        threadIdToString(thread._id),
        thread,
      ])
    ).values()
  ).filter((thread) => {
    const idValue = threadIdToString(thread._id);
    return Boolean(idValue);
  });

  const fallbackThreadCount = uniqueThreads.filter((thread) => !thread.parentId).length;
  const threadCount = userStats.threadCount || fallbackThreadCount;
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
          <Tabs defaultValue="threads" className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-[#1f1f1f] dark:bg-black"
            >
              {profileTabs.map((tab) => (
                <TabsTrigger
                  key={tab.label}
                  value={tab.value}
                  className="rounded-xl px-4 py-2 text-xs"
                >
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
                  </TabsTrigger>
              ))}
            </TabsList>

            {profileTabs.map((tab) => (
              <TabsContent key={`content-${tab.label}`} value={tab.value} className="w-full">
                {tab.value === "threads" ? (
                  <ThreadsTab
                    currentUserId={user.id}
                    accountId={userInfo.id}
                    accountType="User"
                    mode="threads"
                  />
                ) : tab.value === "replies" ? (
                  <ThreadsTab
                    currentUserId={user.id}
                    accountId={userInfo.id}
                    accountType="User"
                    mode="replies"
                  />
                ) : (
                  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                    {/* TODO: Implement {tab.label.toLowerCase()} content */}
                    {tab.label} will be available soon.
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}

export default Page;

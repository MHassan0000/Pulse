import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { communityTabs } from "@/constants";
import UserCard from "@/components/search/UserCard";
import ThreadsTab from "@/components/profile/ThreadsTab";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { fetchCommunityDetails } from "@/lib/actions/community.actions";

type CommunityMember = {
  id: string;
  name: string;
  username: string;
  image: string;
};

async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const communityDetails = await fetchCommunityDetails(id);
  if (!communityDetails) redirect("/communities");

  return (
    <section className="page-scroll h-full overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <ProfileHeader
          accountId={communityDetails.createdBy?.id ?? ""}
          authUserId={user.id}
          name={communityDetails.name}
          username={communityDetails.username}
          imgUrl={communityDetails.image}
          bio={communityDetails.bio}
          type="Community"
        />

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-6">
          <Tabs defaultValue="threads" className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-[#1f1f1f] dark:bg-black"
            >
              {communityTabs.map((tab) => (
                <TabsTrigger
                  key={tab.label}
                  value={tab.value}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  <span>{tab.label}</span>
                  {tab.label === "Threads" ? (
                    <span className="ml-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {communityDetails.threads?.length ?? 0}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="threads" className="w-full">
              <ThreadsTab
                currentUserId={user.id}
                accountId={communityDetails._id?.toString() ?? ""}
                accountType="Community"
                mode="threads"
              />
            </TabsContent>

            <TabsContent value="members" className="w-full">
              <section className="mt-6 flex flex-col gap-4">
                {communityDetails.members?.length ? (
                  (communityDetails.members as CommunityMember[]).map((member) => (
                    <UserCard
                      key={member.id}
                      id={member.id}
                      name={member.name}
                      username={member.username}
                      imgUrl={member.image}
                      personType="User"
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                    No members yet.
                  </div>
                )}
              </section>
            </TabsContent>

            <TabsContent value="requests" className="w-full">
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                {/* TODO: integrate join request moderation workflow */}
                Requests will be available soon.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

export default Page;

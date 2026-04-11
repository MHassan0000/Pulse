import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { communityTabs } from "@/constants";
import ThreadsTab from "@/components/profile/ThreadsTab";
import Pagination from "@/components/layout/Pagination";
import ProfileHeader from "@/components/profile/ProfileHeader";
import CommunityActions from "@/components/community/CommunityActions";
import MemberRow from "@/components/community/MemberRow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { fetchCommunityDetails } from "@/lib/actions/community.actions";

export const dynamic = "force-dynamic";

const safeText = (value: unknown) =>
  typeof value === "string" ? value : "";

type CommunityMember = {
  id: string;
  name: string;
  username: string;
  image: string;
};

type CommunityDetailsShape = {
  _id?: unknown;
  id: string;
  name: string;
  username: string;
  image: string;
  bio: string;
  threadCount?: number;
  createdBy?: { id?: string };
  members?: Array<CommunityMember | { id?: unknown; name?: unknown; username?: unknown; image?: unknown }>;
};

type CommunitySearchParams = {
  tab?: string;
  threadsPage?: string;
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
  searchParams?: Promise<CommunitySearchParams>;
}) {
  try {
    const { id } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const communityDetails = (await fetchCommunityDetails(id)) as CommunityDetailsShape | null;
    if (!communityDetails) redirect("/communities");

    const currentUserAppId = safeText(user.id);
    const ownerUserId = safeText(communityDetails.createdBy?.id);
    const normalizedMembers: CommunityMember[] = (communityDetails.members ?? []).map((member) => ({
      id: safeText(member?.id),
      name: safeText(member?.name),
      username: safeText(member?.username),
      image: safeText(member?.image),
    }));
    const communityThreadAccountId = safeText(communityDetails.id);
    const threadCount =
      typeof communityDetails.threadCount === "number"
        ? communityDetails.threadCount
        : 0;

    if (!communityThreadAccountId) {
      redirect("/communities");
    }

    const communityPathname = `/communities/${id}`;
    const activeTab =
      resolvedSearchParams?.tab === "threads" ||
      resolvedSearchParams?.tab === "members" ||
      resolvedSearchParams?.tab === "requests"
        ? resolvedSearchParams.tab
        : "threads";
    const threadsPage = resolvePositivePage(resolvedSearchParams?.threadsPage);

    const tabHref = (tabValue: "threads" | "members" | "requests") => {
      const paramsValue = new URLSearchParams();
      paramsValue.set("tab", tabValue);

      if (tabValue === "threads" && threadsPage > 1) {
        paramsValue.set("threadsPage", String(threadsPage));
      }

      if (tabValue !== "threads" && threadsPage > 1) {
        paramsValue.set("threadsPage", String(threadsPage));
      }

      const query = paramsValue.toString();
      return query ? `${communityPathname}?${query}` : communityPathname;
    };

    const threadTabResult =
      activeTab === "threads"
        ? await ThreadsTab({
            currentUserId: currentUserAppId,
            accountId: communityThreadAccountId,
            accountType: "Community",
            mode: "threads",
            pageNumber: threadsPage,
            pageSize: 10,
          })
        : null;

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
            actionSlot={
              <CommunityActions
                communityId={communityThreadAccountId}
                currentUserId={currentUserAppId}
                ownerUserId={ownerUserId}
                communityName={safeText(communityDetails.name)}
                communityUsername={safeText(communityDetails.username)}
                communityImage={safeText(communityDetails.image)}
                communityBio={safeText(communityDetails.bio)}
              />
            }
          />

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-6">
            <Tabs value={activeTab} className="w-full">
              <TabsList
                variant="line"
                className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-[#1f1f1f] dark:bg-black"
              >
                {communityTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.label}
                    asChild
                    value={tab.value}
                    className="rounded-xl px-4 py-2 text-xs"
                  >
                    <Link
                      href={tabHref(tab.value as "threads" | "members" | "requests")}
                    >
                      <span>{tab.label}</span>
                      {tab.label === "Threads" ? (
                        <span className="ml-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {threadCount}
                        </span>
                      ) : null}
                    </Link>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="threads" className="w-full">
                {activeTab === "threads" ? (
                  <>
                    {threadTabResult?.content}
                    <Pagination
                      path={communityPathname}
                      pageNumber={threadsPage}
                      isNext={Boolean(threadTabResult?.isNext)}
                      queryKey="threadsPage"
                      tabKey="tab"
                      tabValue="threads"
                      preserveQueryKeys={["tab"]}
                    />
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="members" className="w-full">
                <section className="mt-6 flex flex-col gap-4">
                  {communityDetails.members?.length ? (
                    normalizedMembers.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        communityId={communityThreadAccountId}
                        currentUserId={currentUserAppId}
                        ownerUserId={ownerUserId}
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
  } catch {
    return (
      <section className="page-scroll h-full overflow-y-auto pb-24">
        <div className="mx-auto flex w-full max-w-4xl flex-col">
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
            We couldn&apos;t load this community right now.
          </div>
        </div>
      </section>
    );
  }
}

export default Page;

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ActivityItem from "@/components/activity/ActivityItem";
import { fetchUser, getActivity } from "@/lib/actions/user.actions";

type ActivityRecord = {
  _id: unknown;
  parentId?: string | null;
  type?: "reply" | "nested_reply" | "community";
  author?: {
    id?: string;
    name?: string;
    username?: string;
    image?: string;
  };
  community?: {
    id?: string;
    name?: string;
    image?: string;
  } | null;
  createdAt?: string | Date;
};

async function Page() {
  try {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const userInfo = await fetchUser(user.id);
    if (!userInfo?.onboarded) redirect("/onboarding");

    const activity = await getActivity(userInfo._id?.toString() ?? "");

    return (
      <section className="page-scroll h-full overflow-y-auto pb-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-8">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Inbox</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Activity
              </h1>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                See who has interacted with your threads and conversations.
              </p>
            </div>

            <section className="flex flex-col gap-3">
              {activity.length > 0 ? (
                activity.map((item: ActivityRecord) => (
                  <ActivityItem
                    key={String(item._id)}
                    id={String(item._id)}
                    parentId={item.parentId ?? null}
                    type={item.type}
                    author={{
                      id: item.author?.id ?? "",
                      name: item.author?.name ?? "Someone",
                      username: item.author?.username ?? "",
                      image: item.author?.image ?? "",
                    }}
                    community={
                      item.community
                        ? {
                            id: item.community.id ?? "",
                            name: item.community.name ?? "",
                            image: item.community.image ?? "",
                          }
                        : null
                    }
                    createdAt={
                      item.createdAt
                        ? new Date(item.createdAt).toISOString().slice(0, 16).replace("T", " ")
                        : ""
                    }
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                  No activity yet.
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    );
  } catch {
    return (
      <section className="page-scroll h-full overflow-y-auto pb-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
            We couldn&apos;t load activity right now.
          </div>
        </div>
      </section>
    );
  }
}

export default Page;

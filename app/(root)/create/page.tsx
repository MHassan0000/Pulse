import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import PostThread from "@/components/forms/PostThread";
import { fetchUser } from "@/lib/actions/user.actions";

const CreateThread = async () => {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    // fetch organization list created by user
    const userInfo = await fetchUser(user.id);
    if (!userInfo?.onboarded) redirect("/onboarding");

    return (
    <main className="page-scroll h-full overflow-y-auto bg-white text-zinc-900 dark:bg-black dark:text-white">
      <div className="mx-auto flex max-w-3xl flex-col px-6 pb-24 pt-20 md:pt-24">
        <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-[0_0_60px_rgba(0,0,0,0.06)] md:p-8 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:shadow-[0_0_60px_rgba(255,255,255,0.05)]">
                    <div className="mb-8">
                        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                            Create
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">
                            Start a new thread
                        </h1>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Share an update with your community. Keep it short or expand it.
                        </p>
                    </div>
                    <PostThread userId={userInfo.id} />
                </div>
            </div>
        </main>
    );
};

export default CreateThread;

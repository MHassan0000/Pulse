"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { fetchUser } from "@/lib/actions/user.actions";
import AccountProfile from "@/components/forms/AccountProfile";

const Page = async () => {
  const { user } = useUser();

  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (userInfo?.onboarded) redirect("/");

  const userData = {
    id: user.id,
    objectId: userInfo?._id,
    username: userInfo ? userInfo?.username : user.username,
    name: userInfo ? userInfo?.name : user.firstName ?? "",
    bio: userInfo ? userInfo?.bio : "",
    image: userInfo ? userInfo?.image : user.imageUrl,
  };

  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white">
      <div className="mx-auto flex max-w-3xl flex-col px-6 pb-24 pt-24">
        <div className="rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-[0_0_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:shadow-[0_0_60px_rgba(255,255,255,0.05)]">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Onboarding
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">
              Complete your profile
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Add your details so people can recognize you in the feed.
            </p>
          </div>
          <AccountProfile user={userData} btnTitle="Continue" />
        </div>
      </div>
    </main>
  );
};

export default Page;

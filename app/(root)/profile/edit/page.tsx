import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import AccountProfile from "@/components/forms/AccountProfile";
import { fetchUser } from "@/lib/actions/user.actions";

const EditProfilePage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userInfo = await fetchUser(user.id);
  if (!userInfo) redirect("/onboarding");
  if (!userInfo.onboarded) redirect("/onboarding");

  const userData = {
    id: user.id,
    objectId: userInfo?._id?.toString() ?? "",
    username: userInfo?.username ?? user.username ?? "",
    name: userInfo?.name ?? user.fullName ?? user.firstName ?? "",
    bio: userInfo?.bio ?? "",
    image: userInfo?.image ?? user.imageUrl,
  };

  return (
    <section className="page-scroll h-full overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.08)] dark:border-[#1f1f1f] dark:from-[#111] dark:via-[#0f0f0f] dark:to-[#0a0a0a] md:p-8">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Profile</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Edit your profile
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Keep your public profile fresh and make it easier for people to recognize you.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 dark:border-[#242424] dark:bg-black dark:text-zinc-300">
              @{userData.username}
            </div>
          </div>

          <AccountProfile
            user={userData}
            btnTitle="Save profile"
            heading="Public identity"
            description="Changes apply across your posts, replies, and activity."
            profileMode="edit"
          />
        </div>
      </div>
    </section>
  );
};

export default EditProfilePage;

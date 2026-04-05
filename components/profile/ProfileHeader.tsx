import Image from "next/image";
import Link from "next/link";

type ProfileHeaderProps = {
  accountId: string;
  authUserId: string;
  name: string;
  username: string;
  imgUrl: string;
  bio: string;
};

const ProfileHeader = ({
  accountId,
  authUserId,
  name,
  username,
  imgUrl,
  bio,
}: ProfileHeaderProps) => {
  const isOwnProfile = accountId === authUserId;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
            {imgUrl ? (
              <Image
                src={imgUrl}
                alt={`${name} profile`}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">@{username}</p>
          </div>
        </div>

        {isOwnProfile && (
          <Link
            href="/profile/edit"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 px-4 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-100 dark:border-[#2a2a2a] dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Edit profile
          </Link>
        )}
      </div>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {bio || "No bio yet."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-[#1f1f1f] dark:bg-black">
          Public profile
        </span>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-[#1f1f1f] dark:bg-black">
          Joined Pulse
        </span>
      </div>
    </section>
  );
};

export default ProfileHeader;

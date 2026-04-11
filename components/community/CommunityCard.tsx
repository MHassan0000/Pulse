import Image from "next/image";
import Link from "next/link";

type CommunityCardProps = {
  id: string;
  name: string;
  username: string;
  imgUrl: string;
  bio?: string;
  membersCount?: number;
};

const CommunityCard = ({
  id,
  name,
  username,
  imgUrl,
  bio,
  membersCount = 0,
}: CommunityCardProps) => {
  return (
    <Link
      href={`/communities/${id}`}
      className="group flex w-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:border-zinc-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:hover:border-zinc-700 md:w-[calc(50%-0.5rem)]"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={`${name} logo`}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{name}</p>
          <p className="text-xs text-zinc-500">@{username}</p>
        </div>
      </div>

      <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
        {bio || "Community bio coming soon."}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{membersCount} members</span>
        <span className="rounded-full border border-zinc-200 px-3 py-1 font-semibold text-zinc-600 transition-all duration-200 group-hover:bg-zinc-100 dark:border-[#2a2a2a] dark:text-zinc-300 dark:group-hover:bg-zinc-900">
          Open
        </span>
      </div>
    </Link>
  );
};

export default CommunityCard;

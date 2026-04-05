import Image from "next/image";
import Link from "next/link";

type UserCardProps = {
  id: string;
  name: string;
  username: string;
  imgUrl: string;
  personType: "User" | "Community";
};

const UserCard = ({ id, name, username, imgUrl, personType }: UserCardProps) => {
  const href = personType === "User" ? `/profile/${id}` : `/communities/${id}`;

  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 transition-all duration-200 hover:border-zinc-300 hover:shadow-[0_12px_35px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:hover:border-zinc-700"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={`${name} avatar`}
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

      <span className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600 transition-all duration-200 group-hover:bg-zinc-100 dark:border-[#2a2a2a] dark:text-zinc-300 dark:group-hover:bg-zinc-900">
        View profile
      </span>
    </Link>
  );
};

export default UserCard;

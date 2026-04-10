import Image from "next/image";
import Link from "next/link";

type ActivityItemProps = {
  id: string;
  parentId: string | null;
  type?: "reply" | "nested_reply" | "community" | "like" | "repost";
  author: {
    id?: string;
    name: string;
    username?: string;
    image: string;
  };
  community?: {
    id: string;
    name: string;
    image: string;
  } | null;
  createdAt?: string;
};

const ActivityItem = ({
  id,
  parentId,
  type = "reply",
  author,
  community,
  createdAt,
}: ActivityItemProps) => {
  const targetThread = parentId ?? id;

  const activityText =
    type === "community"
      ? community?.name
        ? `posted in ${community.name}.`
        : "posted in one of your communities."
      : type === "like"
        ? "liked your thread."
        : type === "repost"
          ? "reposted your thread."
      : type === "nested_reply"
        ? "replied in a thread where you also replied."
        : "replied to your thread.";

  return (
    <Link
      href={`/thread/${targetThread}`}
      className="group flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition-all duration-200 hover:border-zinc-300 hover:shadow-[0_12px_35px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:hover:border-zinc-700"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
        {author.image ? (
          <Image
            src={author.image}
            alt={`${author.name} avatar`}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          <span className="font-semibold text-zinc-900 dark:text-white">{author.name}</span>{" "}
          {activityText}
        </p>
        {author.username ? (
          <p className="mt-1 text-xs text-zinc-500">@{author.username}</p>
        ) : null}
        {createdAt ? (
          <p className="mt-1 text-xs text-zinc-500">{createdAt}</p>
        ) : null}
      </div>

      <span className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600 transition-all duration-200 group-hover:bg-zinc-100 dark:border-[#2a2a2a] dark:text-zinc-300 dark:group-hover:bg-zinc-900">
        View
      </span>
    </Link>
  );
};

export default ActivityItem;

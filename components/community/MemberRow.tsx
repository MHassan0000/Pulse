"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { removeMemberFromCommunityAsAdmin } from "@/lib/actions/community.actions";

type MemberRowProps = {
  member: {
    id: string;
    name: string;
    username: string;
    image: string;
  };
  communityId: string;
  currentUserId: string;
  ownerUserId: string;
};

const MemberRow = ({
  member,
  communityId,
  currentUserId,
  ownerUserId,
}: MemberRowProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const canRemove = currentUserId === ownerUserId && member.id !== ownerUserId;

  const handleRemove = () => {
    if (!canRemove) return;
    startTransition(async () => {
      await removeMemberFromCommunityAsAdmin(
        communityId,
        member.id,
        currentUserId,
        pathname
      );
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
      <Link href={`/profile/${member.id}`} className="flex items-center gap-3">
        <span className="h-10 w-10 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
          {member.image ? (
            <Image
              src={member.image}
              alt={`${member.name} avatar`}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : null}
        </span>
        <span>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{member.name}</p>
          <p className="text-xs text-zinc-500">@{member.username}</p>
        </span>
      </Link>

      {canRemove ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleRemove}
          disabled={pending}
          className="rounded-full text-xs"
        >
          Remove
        </Button>
      ) : null}
    </div>
  );
};

export default MemberRow;

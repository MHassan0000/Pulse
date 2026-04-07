"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteCommunityAsAdmin,
  joinCommunity,
  leaveCommunity,
} from "@/lib/actions/community.actions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CommunityActionsProps = {
  communityId: string;
  currentUserId: string;
  ownerUserId: string;
  isMember: boolean;
  isAuthenticated: boolean;
};

const CommunityActions = ({
  communityId,
  currentUserId,
  ownerUserId,
  isMember,
  isAuthenticated,
}: CommunityActionsProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localMember, setLocalMember] = useState(isMember);

  const isAdmin = currentUserId === ownerUserId;

  const handleJoinLeave = () => {
    startTransition(async () => {
      if (localMember) {
        await leaveCommunity(communityId, currentUserId, pathname);
        setLocalMember(false);
        return;
      }

      await joinCommunity(communityId, currentUserId, pathname);
      setLocalMember(true);
    });
  };

  const handleDeleteCommunity = () => {
    startTransition(async () => {
      await deleteCommunityAsAdmin(communityId, currentUserId, pathname);
      router.push("/communities");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={handleJoinLeave}
        disabled={pending || !isAuthenticated || isAdmin}
        className={`rounded-full px-4 text-xs font-semibold ${
          localMember
            ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-900"
            : "bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        }`}
      >
        {isAdmin ? "Admin" : localMember ? "Leave" : "Join"}
      </Button>

      {isAdmin ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full px-4 text-xs font-semibold"
            >
              Delete community
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete community</DialogTitle>
              <DialogDescription>
                This will permanently remove the community and all its threads.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={handleDeleteCommunity}>
                  Delete
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};

export default CommunityActions;

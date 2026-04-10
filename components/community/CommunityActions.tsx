"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteCommunityAsAdmin } from "@/lib/actions/community.actions";
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
import CommunitySettingsDialog from "@/components/community/CommunitySettingsDialog";

type CommunityActionsProps = {
  communityId: string;
  currentUserId: string;
  ownerUserId: string;
  communityName: string;
  communityUsername: string;
  communityImage: string;
  communityBio: string;
};

const CommunityActions = ({
  communityId,
  currentUserId,
  ownerUserId,
  communityName,
  communityUsername,
  communityImage,
  communityBio,
}: CommunityActionsProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isAdmin = currentUserId === ownerUserId;

  const handleDeleteCommunity = () => {
    startTransition(async () => {
      await deleteCommunityAsAdmin(communityId, currentUserId, pathname);
      router.push("/communities");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isAdmin ? (
        <>
          <CommunitySettingsDialog
            communityId={communityId}
            adminUserId={currentUserId}
            defaultName={communityName}
            defaultUsername={communityUsername}
            defaultImage={communityImage}
            defaultBio={communityBio}
          />

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
        </>
      ) : null}
    </div>
  );
};

export default CommunityActions;

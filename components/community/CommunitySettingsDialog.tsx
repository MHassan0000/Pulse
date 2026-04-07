"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { updateCommunityInfoAsAdmin } from "@/lib/actions/community.actions";

type CommunitySettingsDialogProps = {
  communityId: string;
  adminUserId: string;
  defaultName: string;
  defaultUsername: string;
  defaultImage: string;
};

const CommunitySettingsDialog = ({
  communityId,
  adminUserId,
  defaultName,
  defaultUsername,
  defaultImage,
}: CommunitySettingsDialogProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(defaultName);
  const [username, setUsername] = useState(defaultUsername);
  const [image, setImage] = useState(defaultImage);

  const handleSave = () => {
    startTransition(async () => {
      await updateCommunityInfoAsAdmin(
        communityId,
        name,
        username,
        image,
        adminUserId,
        pathname
      );
      router.refresh();
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-full px-4 text-xs font-semibold"
        >
          Edit community
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Community settings</DialogTitle>
          <DialogDescription>
            Update your community profile details.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Community name"
            className="rounded-xl"
          />
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Community username"
            className="rounded-xl"
          />
          <Input
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="Community image URL"
            className="rounded-xl"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleSave} disabled={pending}>
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommunitySettingsDialog;

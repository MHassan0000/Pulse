"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  defaultBio: string;
};

type FormErrors = {
  name?: string;
  username?: string;
  image?: string;
  bio?: string;
  submit?: string;
};

const sanitizeUsername = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);

const isValidImageUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const CommunitySettingsDialog = ({
  communityId,
  adminUserId,
  defaultName,
  defaultUsername,
  defaultImage,
  defaultBio,
}: CommunitySettingsDialogProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(defaultName);
  const [username, setUsername] = useState(defaultUsername);
  const [image, setImage] = useState(defaultImage);
  const [bio, setBio] = useState(defaultBio);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = () => {
    const nextErrors: FormErrors = {};

    const trimmedName = name.trim();
    const normalizedUsername = sanitizeUsername(username);
    const trimmedBio = bio.trim();

    if (trimmedName.length < 3) {
      nextErrors.name = "Name must be at least 3 characters.";
    }

    if (normalizedUsername.length < 3) {
      nextErrors.username = "Username must be at least 3 characters.";
    }

    if (trimmedBio.length < 3) {
      nextErrors.bio = "Bio must be at least 3 characters.";
    } else if (trimmedBio.length > 280) {
      nextErrors.bio = "Bio must be 280 characters or less.";
    }

    if (!isValidImageUrl(image)) {
      nextErrors.image = "Image URL must be a valid http(s) link.";
    }

    setErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      trimmedName,
      normalizedUsername,
      trimmedBio,
      trimmedImage: image.trim(),
    };
  };

  const resetFormState = () => {
    setName(defaultName);
    setUsername(defaultUsername);
    setImage(defaultImage);
    setBio(defaultBio);
    setErrors({});
  };

  const handleSave = () => {
    const result = validate();
    if (!result.isValid) return;

    startTransition(async () => {
      try {
        await updateCommunityInfoAsAdmin(
          communityId,
          result.trimmedName,
          result.normalizedUsername,
          result.trimmedImage,
          result.trimmedBio,
          adminUserId,
          pathname
        );
        router.refresh();
        setOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update community.";
        setErrors({ submit: message });
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetFormState();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-zinc-200 px-4 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Edit community
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-zinc-200 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] sm:max-w-xl">
        <DialogHeader>
          <div className="rounded-t-3xl border-b border-zinc-200 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 px-6 py-5 dark:border-[#1f1f1f] dark:from-[#111] dark:via-[#0f0f0f] dark:to-[#111]">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Community settings
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Update public profile details for this community.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-4 px-6 pb-6 pt-5">
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Name
            </label>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((prev) => ({ ...prev, name: undefined, submit: undefined }));
              }}
              placeholder="Community name"
              className="h-11 rounded-xl border-zinc-200 bg-white text-sm dark:border-[#1f1f1f] dark:bg-black"
              maxLength={60}
            />
            {errors.name ? <p className="text-xs text-red-500">{errors.name}</p> : null}
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Handle
            </label>
            <Input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setErrors((prev) => ({ ...prev, username: undefined, submit: undefined }));
              }}
              placeholder="Community handle"
              className="h-11 rounded-xl border-zinc-200 bg-white text-sm dark:border-[#1f1f1f] dark:bg-black"
              maxLength={40}
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              This updates the public handle, not the internal organization id.
            </p>
            {errors.username ? <p className="text-xs text-red-500">{errors.username}</p> : null}
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Image URL
            </label>
            <Input
              value={image}
              onChange={(event) => {
                setImage(event.target.value);
                setErrors((prev) => ({ ...prev, image: undefined, submit: undefined }));
              }}
              placeholder="https://"
              className="h-11 rounded-xl border-zinc-200 bg-white text-sm dark:border-[#1f1f1f] dark:bg-black"
            />
            {errors.image ? <p className="text-xs text-red-500">{errors.image}</p> : null}
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Bio
            </label>
            <Textarea
              value={bio}
              onChange={(event) => {
                setBio(event.target.value);
                setErrors((prev) => ({ ...prev, bio: undefined, submit: undefined }));
              }}
              rows={4}
              maxLength={280}
              className="rounded-xl border-zinc-200 bg-white text-sm dark:border-[#1f1f1f] dark:bg-black"
              placeholder="What is this community about?"
            />
            <div className="flex items-center justify-between">
              {errors.bio ? <p className="text-xs text-red-500">{errors.bio}</p> : <span />}
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{bio.length}/280</p>
            </div>
          </div>

          {errors.submit ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {errors.submit}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-zinc-200 px-6 pb-5 pt-4 dark:border-[#1f1f1f]">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-xl">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={pending}
            className="rounded-xl bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-black"
          >
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommunitySettingsDialog;

"use client";

import * as z from "zod";
import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { usePathname, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useUploadThing } from "@/lib/uploadthing";
import { isBase64Image } from "@/lib/utils";
import { UserValidation } from "@/lib/validations/user";
import { updateUser } from "@/lib/actions/user.actions";

interface Props {
  user: {
    id: string;
    objectId: string;
    username: string;
    name: string;
    bio: string;
    image: string;
  };
  btnTitle: string;
}

const AccountProfile = ({ user, btnTitle }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const { startUpload } = useUploadThing("mediaUploader");
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<z.infer<typeof UserValidation>>({
    resolver: zodResolver(UserValidation),
    defaultValues: {
      profile_photo: user?.image ? user.image : "",
      name: user?.name ? user.name : "",
      username: user?.username ? user.username : "",
      bio: user?.bio ? user.bio : "",
    },
  });

  const handleImage = (
    e: ChangeEvent<HTMLInputElement>,
    fieldChange: (value: string) => void
  ) => {
    e.preventDefault();

    const fileReader = new FileReader();

    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFiles(Array.from(e.target.files));

      if (!file.type.includes("image")) return;

      fileReader.onload = async (event) => {
        const imageDataUrl = event.target?.result?.toString() || "";
        fieldChange(imageDataUrl);
      };

      fileReader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof UserValidation>) => {
    const blob = values.profile_photo;

    const hasImageChanged = isBase64Image(blob);
    if (hasImageChanged) {
      const imgRes = await startUpload(files);

      if (imgRes && imgRes[0]?.url) {
        values.profile_photo = imgRes[0].url;
      }
    }

    await updateUser({
      name: values.name,
      path: pathname,
      username: values.username,
      userId: user.id,
      bio: values.bio,
      image: values.profile_photo,
    });

    if (pathname === "/profile/edit") {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <Form {...form}>
      <form
        className="flex flex-col justify-start gap-8"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="profile_photo"
          render={({ field }) => (
            <FormItem className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
              <FormLabel className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black">
                {field.value ? (
                  <Image
                    src={field.value}
                    alt="profile_icon"
                    width={64}
                    height={64}
                    priority
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <Image
                    src="/assets/profile.svg"
                    alt="profile_icon"
                    width={24}
                    height={24}
                    className="object-contain opacity-60"
                  />
                )}
              </FormLabel>
              <FormControl className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  placeholder="Add profile photo"
                  className="cursor-pointer border-zinc-200 bg-white text-sm text-zinc-700 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-600 hover:file:bg-zinc-200 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-200 dark:file:bg-zinc-900 dark:file:text-zinc-300 dark:hover:file:bg-zinc-800"
                  onChange={(e) => handleImage(e, field.onChange)}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col gap-3">
              <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Name
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  className="rounded-2xl border-zinc-200 bg-white text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-200 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-100 dark:focus-visible:ring-[#2a2a2a]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col gap-3">
              <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Username
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  className="rounded-2xl border-zinc-200 bg-white text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-200 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-100 dark:focus-visible:ring-[#2a2a2a]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col gap-3">
              <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Bio
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  className="rounded-2xl border-zinc-200 bg-white text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-200 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-100 dark:focus-visible:ring-[#2a2a2a]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full rounded-2xl bg-zinc-900 text-white transition-all duration-200 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200   cursor-pointer"
        >
          {btnTitle}
        </Button>
      </form>
    </Form>
  );
};

export default AccountProfile;

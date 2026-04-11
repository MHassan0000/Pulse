"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { useOrganization } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { ImageIcon, Loader2, Text, Video, X } from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { useTheme } from "@/components/theme/ThemeProvider";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { ThreadValidation } from "@/lib/validations/thread";
import { createThread } from "@/lib/actions/thread.actions";
import { useUploadThing } from "@/lib/uploadthing";

declare global {
  interface Window {
    electron?: {
      openEmojiPanel?: () => void;
    };
  }
}

interface Props {
  userId: string;
}

type ThreadFormValues = z.input<typeof ThreadValidation>;
type ThreadFormOutput = z.output<typeof ThreadValidation>;
type ThreadMedia = ThreadFormOutput["media"][number];
type UploadServerData = { media?: ThreadMedia };

const PostThread = ({ userId }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const { organization } = useOrganization();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [media, setMedia] = useState<ThreadMedia[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const { startUpload, isUploading } = useUploadThing("mediaUploader");

  const form = useForm<ThreadFormValues, unknown, ThreadFormOutput>({
    resolver: zodResolver(ThreadValidation),
    defaultValues: {
      thread: "",
      media: [],
      accountId: userId,
    },
  });

  const onSubmit = async (values: ThreadFormOutput) => {
    const normalizedText = values.thread.trim();
    const currentMedia = media;

    if (normalizedText.length < 3 && currentMedia.length === 0) {
      form.setError("thread", {
        type: "manual",
        message: "Add at least 3 characters or attach media.",
      });
      return;
    }

    setComposerError(null);
    setIsSubmitting(true);

    try {
      const result = await createThread({
        text: normalizedText,
        author: userId,
        communityId: organization ? organization.id : null,
        path: pathname,
        media: currentMedia,
      });

      if (result) {
        router.push(`/thread/${result}`);
        return;
      }

      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to publish thread.";
      setComposerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateLocalFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return "Only image and video files are allowed.";

    const maxBytes = isVideo ? 64 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      return isVideo
        ? "Video files must be 64MB or smaller."
        : "Image files must be 8MB or smaller.";
    }

    return null;
  };

  const handlePickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";

    if (!selectedFiles.length) return;
    setComposerError(null);

    if (media.length + selectedFiles.length > 4) {
      setComposerError("You can attach up to 4 files per thread.");
      return;
    }

    for (const file of selectedFiles) {
      const message = validateLocalFile(file);
      if (message) {
        setComposerError(message);
        return;
      }
    }

    const uploaded = await startUpload(selectedFiles);
    if (!uploaded || !uploaded.length) {
      setComposerError("Upload failed. Please try again.");
      return;
    }

    const nextMedia: ThreadMedia[] = [];
    for (const item of uploaded) {
      const serverMedia = (item.serverData as UploadServerData | undefined)?.media;
      if (!serverMedia) continue;
      nextMedia.push(serverMedia);
    }

    if (!nextMedia.length) {
      setComposerError("Upload completed but media metadata was missing.");
      return;
    }

    setMedia((prev) => {
      const combined = [...prev, ...nextMedia];
      form.setValue("media", combined, { shouldDirty: true, shouldValidate: true });
      return combined.slice(0, 4);
    });
  };

  const removeMediaAt = (index: number) => {
    setMedia((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      form.setValue("media", next, { shouldDirty: true, shouldValidate: true });
      return next;
    });
  };

  const clearComposer = () => {
    form.reset({
      thread: "",
      media: [],
      accountId: userId,
    });
    setMedia([]);
    setComposerError(null);
  };

  const editorCommands = useMemo(
    () => [
      commands.bold,
      commands.italic,
      commands.strikethrough,
      commands.hr,
      commands.quote,
      commands.unorderedListCommand,
      commands.orderedListCommand,
      commands.code,
      commands.link,
    ],
    []
  );

  return (
    <Form {...form}>
      <form
        className="mt-8 flex flex-col gap-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#1f1f1f] dark:bg-[#111111]">
          <FormField
            control={form.control}
            name="thread"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    What&apos;s new?
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition-all duration-200 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:text-zinc-300 dark:hover:bg-zinc-900"
                      onClick={() => setIsExpanded((prev) => !prev)}
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                    </button>
                  </div>
                </div>
                <FormControl>
                  <div data-color-mode={theme} ref={editorRef}>
                    <MDEditor
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? "")}
                      preview="live"
                      height={isExpanded ? 320 : 220}
                      visibleDragbar={false}
                      commands={editorCommands}
                      previewOptions={{ disallowedElements: ["img", "video", "source"] }}
                      textareaProps={{
                        placeholder:
                          "Share a thought, ask a question, or start a thread...",
                      }}
                      className="md-editor-scroll overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 text-zinc-800 shadow-none dark:border-[#1f1f1f] dark:bg-black/60 dark:text-zinc-100"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handlePickFiles}
              />
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-all duration-200 hover:bg-zinc-100 disabled:opacity-50 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSubmitting || media.length >= 4}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {isUploading ? "Uploading..." : "Add media"}
              </button>

              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                <Video className="h-3.5 w-3.5" />
                {media.length}/4
              </span>

              <button
                type="button"
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${isExpanded
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                onClick={() => setIsExpanded((prev) => !prev)}
              >
                <Text className="h-4 w-4" />
                {isExpanded ? "Short text" : "Long text"}
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>Markdown supported. Attach up to 4 images/videos.</span>
              <button
                type="button"
                className="flex items-center gap-2 text-xs text-zinc-500 transition-all duration-200 hover:text-zinc-700 dark:hover:text-zinc-300"
                onClick={clearComposer}
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          {media.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {media.map((item, index) => (
                <div
                  key={`${item.providerKey}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-[#1f1f1f] dark:bg-black"
                >
                  <span className="truncate text-zinc-600 dark:text-zinc-300">
                    {item.kind === "image" ? "Image" : "Video"} {index + 1}
                  </span>
                  <button
                    type="button"
                    className="ml-2 rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:text-zinc-300 dark:hover:bg-zinc-900"
                    onClick={() => removeMediaAt(index)}
                    disabled={isUploading || isSubmitting}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {composerError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {composerError}
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="w-full rounded-2xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
        >
          {isSubmitting ? "Posting..." : "Post Thread"}
        </Button>
      </form>
    </Form>
  );
};

export default PostThread;

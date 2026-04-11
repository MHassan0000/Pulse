"use client";

import { z } from "zod";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeEvent, useRef, useState } from "react";
import { ImageIcon, Loader2, Video, X } from "lucide-react";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";

import { Input } from "../ui/input";
import { Button } from "../ui/button";

import { CommentValidation } from "@/lib/validations/thread";
import { addCommentToThread } from "@/lib/actions/thread.actions";
import { useUploadThing } from "@/lib/uploadthing";

interface Props {
    threadId: string;
    currentUserImg: string;
    currentUserId: string;
}

type CommentFormValues = z.input<typeof CommentValidation>;
type CommentFormOutput = z.output<typeof CommentValidation>;
type CommentMedia = CommentFormOutput["media"][number];
type UploadServerData = { media?: CommentMedia };

function Comment({ threadId, currentUserImg, currentUserId }: Props) {
    const pathname = usePathname();
    const [media, setMedia] = useState<CommentMedia[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [composerError, setComposerError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { startUpload, isUploading } = useUploadThing("mediaUploader");

    const form = useForm<CommentFormValues, unknown, CommentFormOutput>({
        resolver: zodResolver(CommentValidation),
        defaultValues: {
            thread: "",
            media: [],
        },
    });

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
            setComposerError("You can attach up to 4 files per reply.");
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

        const nextMedia: CommentMedia[] = [];
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
            const combined = [...prev, ...nextMedia].slice(0, 4);
            form.setValue("media", combined, { shouldDirty: true, shouldValidate: true });
            return combined;
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
        form.reset({ thread: "", media: [] });
        setMedia([]);
        setComposerError(null);
    };

    const onSubmit = async (values: CommentFormOutput) => {
        const normalizedText = values.thread.trim();
        if (normalizedText.length < 3 && media.length === 0) {
            form.setError("thread", {
                type: "manual",
                message: "Add at least 3 characters or attach media.",
            });
            return;
        }

        setComposerError(null);
        setIsSubmitting(true);

        try {
            await addCommentToThread(
                threadId,
                normalizedText,
                currentUserId,
                pathname,
                media
            );

            clearComposer();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to post reply.";
            setComposerError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <FormField
                    control={form.control}
                    name="thread"
                    render={({ field }) => (
                        <FormItem className="flex w-full items-start gap-3">
                            <FormLabel>
                                <Image
                                    src={currentUserImg}
                                    alt="current_user"
                                    width={44}
                                    height={44}
                                    className="rounded-full object-cover"
                                />
                            </FormLabel>
                            <FormControl className="flex-1">
                                <Input
                                    type="text"
                                    {...field}
                                    placeholder="Write a reply..."
                                    className="rounded-2xl border-zinc-200 bg-white text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-200 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-100 dark:focus-visible:ring-[#2a2a2a]"
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex items-center justify-end">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handlePickFiles}
                    />

                    <div className="mr-auto flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isSubmitting || media.length >= 4}
                            className="rounded-full px-3 py-1 text-[11px]"
                        >
                            {isUploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ImageIcon className="mr-1 h-3 w-3" />}
                            {isUploading ? "Uploading" : "Media"}
                        </Button>

                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
                            <Video className="h-3 w-3" />
                            {media.length}/4
                        </span>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={clearComposer}
                            className="rounded-full px-2 py-1 text-[11px]"
                            disabled={isUploading || isSubmitting}
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                        </Button>
                    </div>

                    <Button
                        type="submit"
                        disabled={isUploading || isSubmitting}
                        className="rounded-full bg-zinc-900 px-6 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
                    >
                        {isSubmitting ? "Posting..." : "Reply"}
                    </Button>
                </div>

                {media.length ? (
                    <div className="mt-1 grid gap-2 sm:grid-cols-2">
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
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                        {composerError}
                    </div>
                ) : null}
            </form>
        </Form>
    );
}

export default Comment;

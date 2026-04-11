import * as z from "zod";

const imageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

const videoMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

const mediaMimeTypes = [...imageMimeTypes, ...videoMimeTypes];

export const ThreadMediaValidation = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().url().min(1),
  mimeType: z.enum(mediaMimeTypes),
  size: z.number().int().positive().max(100 * 1024 * 1024),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  durationSec: z.number().nonnegative().optional().nullable(),
  providerKey: z.string().min(1),
});

export const ThreadValidation = z.object({
  thread: z
    .string()
    .max(5000, { message: "Thread is too long." })
    .transform((value) => value.trim()),
  media: z.array(ThreadMediaValidation).max(4).default([]),
  accountId: z.string(),
});

export const CommentValidation = z.object({
  thread: z
    .string()
    .max(5000, { message: "Reply is too long." })
    .transform((value) => value.trim()),
  media: z.array(ThreadMediaValidation).max(4).default([]),
});

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();


export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  mediaUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "8MB",
      maxFileCount: 4,
    },
    video: {
      maxFileSize: "64MB",
      maxFileCount: 4,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ files }) => {
      // This code runs on your server before upload
      const { userId } = await auth();

      // If you throw, the user will not be able to upload
      if (!userId) throw new UploadThingError("Unauthorized");

      if (!Array.isArray(files) || files.length === 0) {
        throw new UploadThingError("No files provided");
      }

      if (files.length > 4) {
        throw new UploadThingError("You can upload up to 4 files per post");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const resolvedUrl =
        typeof file.ufsUrl === "string" && file.ufsUrl.trim().length > 0
          ? file.ufsUrl
          : file.appUrl;

      if (!isImage && !isVideo) {
        throw new UploadThingError("Unsupported file type");
      }

      return {
        uploadedBy: metadata.userId,
        media: {
          kind: isImage ? "image" : "video",
          url: resolvedUrl,
          mimeType: file.type,
          size: file.size,
          width: null,
          height: null,
          durationSec: null,
          providerKey: file.key,
        },
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

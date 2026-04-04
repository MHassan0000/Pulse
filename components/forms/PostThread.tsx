"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { useOrganization } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { Smile, Text, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

import { ThreadValidation } from "@/lib/validations/thread";
import { createThread } from "@/lib/actions/thread.actions";

interface Props {
  userId: string;
}

const PostThread = ({ userId }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const { organization } = useOrganization();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmojiHint, setShowEmojiHint] = useState(false);
  const emojiHintTimeout = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const form = useForm<z.infer<typeof ThreadValidation>>({
    resolver: zodResolver(ThreadValidation),
    defaultValues: {
      thread: "",
      accountId: userId,
    },
  });

  const onSubmit = async (values: z.infer<typeof ThreadValidation>) => {
    await createThread({
      text: values.thread,
      author: userId,
      communityId: organization ? organization.id : null,
      path: pathname,
    });

    router.push("/");
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

  const handleEmojiOpen = () => {
    const textarea = editorRef.current?.querySelector(
      "textarea.w-md-editor-text-input"
    ) as HTMLTextAreaElement | null;
    textarea?.focus();

    setShowEmojiHint(true);
    if (emojiHintTimeout.current) {
      window.clearTimeout(emojiHintTimeout.current);
    }
    emojiHintTimeout.current = window.setTimeout(() => {
      setShowEmojiHint(false);
    }, 2000);
  };

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
                      previewOptions={{ disallowedElements: ["img"] }}
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
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-all duration-200 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
                  onClick={handleEmojiOpen}
                >
                  <Smile className="h-4 w-4" />
                  Emoji
                </button>
                {showEmojiHint ? (
                  <div className="absolute left-0 top-10 z-20 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] text-zinc-600 shadow-lg dark:border-[#1f1f1f] dark:bg-[#111111] dark:text-zinc-300">
                    Press Win + . to open emojis
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
                  isExpanded
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
              <span>Markdown supported. Images and GIFs disabled.</span>
              <button
                type="button"
                className="flex items-center gap-2 text-xs text-zinc-500 transition-all duration-200 hover:text-zinc-700 dark:hover:text-zinc-300"
                onClick={() => form.reset()}
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full rounded-2xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Post Thread
        </Button>
      </form>
    </Form>
  );
};

export default PostThread;

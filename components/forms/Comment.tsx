"use client";

import { z } from "zod";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

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

interface Props {
    threadId: string;
    currentUserImg: string;
    currentUserId: string;
}

function Comment({ threadId, currentUserImg, currentUserId }: Props) {
    const pathname = usePathname();

    const form = useForm<z.infer<typeof CommentValidation>>({
        resolver: zodResolver(CommentValidation),
        defaultValues: {
            thread: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof CommentValidation>) => {
        await addCommentToThread(
            threadId,
            values.thread,
            JSON.parse(currentUserId),
            pathname
        );

        form.reset();
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
                    <Button
                        type="submit"
                        className="rounded-full bg-zinc-900 px-6 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                        Reply
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default Comment;

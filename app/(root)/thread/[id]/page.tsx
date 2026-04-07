import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import Comment from "@/components/forms/Comment";
import PostCard from "@/components/feed/PostCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchThreadById } from "@/lib/actions/thread.actions";

export const revalidate = 0;

async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  if (!id) {
    return (
      <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-24 pt-10 md:px-6">
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
          This thread isn&apos;t available.
        </div>
      </section>
    );
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const thread = await fetchThreadById(id);
  if (!thread) {
    return (
      <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-24 pt-10 md:px-6">
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-400">
          This thread isn&apos;t available.
        </div>
      </section>
    );
  }

  const threadId = thread._id ? String(thread._id) : "";
  const threadAuthor = thread.author ?? {};
  const threadCommunity = thread.community ?? null;

  const threadData = {
    id: threadId,
    parentId: thread.parentId ?? null,
    content: thread.text ?? "",
    author: {
      name: threadAuthor.name ?? "Unknown",
      image: threadAuthor.image ?? "",
      id: threadAuthor.id ?? threadAuthor._id?.toString?.() ?? "",
    },
    community: threadCommunity
      ? {
          id: threadCommunity.id ?? threadCommunity._id?.toString?.() ?? "",
          name: threadCommunity.name ?? "",
          image: threadCommunity.image ?? "",
        }
      : null,
    createdAt: thread.createdAt
      ? new Date(thread.createdAt).toISOString()
      : "",
    comments: Array.isArray(thread.children)
      ? thread.children.map((child: any) => ({
          author: {
            image: child?.author?.image ?? "",
          },
        }))
      : [],
    likes: Array.isArray(thread.likes)
      ? thread.likes.map((likedBy: unknown) => String(likedBy))
      : [],
    reposts: Array.isArray(thread.reposts)
      ? thread.reposts.map((repostedBy: unknown) => String(repostedBy))
      : [],
  };

  return (
    <section className="page-scroll relative mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto px-4 pb-24 pt-10 md:px-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
        <PostCard
          id={threadData.id}
          currentUserId={userInfo.id ?? ""}
          parentId={threadData.parentId}
          content={threadData.content}
          author={threadData.author}
          community={threadData.community}
          createdAt={threadData.createdAt}
          comments={threadData.comments}
          likes={threadData.likes}
          reposts={threadData.reposts}
        />
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
        <Comment
          threadId={id}
          currentUserImg={user.imageUrl}
          currentUserId={userInfo._id?.toString() ?? ""}
        />
      </div>

      <div className="flex flex-col gap-4">
        {thread.children.map((childItem: any) => {
          const childAuthor = childItem.author ?? {};
          const childCommunity = childItem.community ?? null;

          return (
            <div
              key={childItem._id}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.35em] text-zinc-400">
                  Reply
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-zinc-200/80 to-transparent dark:from-[#2a2a2a]/80" />
              </div>
              <PostCard
                id={childItem._id ? String(childItem._id) : ""}
                currentUserId={userInfo.id ?? ""}
                parentId={childItem.parentId ?? null}
                content={childItem.text ?? ""}
                author={{
                  name: childAuthor.name ?? "Unknown",
                  image: childAuthor.image ?? "",
                  id: childAuthor.id ?? childAuthor._id?.toString?.() ?? "",
                }}
                community={
                  childCommunity
                    ? {
                        id:
                          childCommunity.id ??
                          childCommunity._id?.toString?.() ??
                          "",
                        name: childCommunity.name ?? "",
                        image: childCommunity.image ?? "",
                      }
                    : null
                }
                createdAt={
                  childItem.createdAt
                    ? new Date(childItem.createdAt).toISOString()
                    : ""
                }
                comments={
                  Array.isArray(childItem.children)
                    ? childItem.children.map((child: any) => ({
                        author: {
                          image: child?.author?.image ?? "",
                        },
                      }))
                    : []
                }
                likes={
                  Array.isArray(childItem.likes)
                    ? childItem.likes.map((likedBy: unknown) => String(likedBy))
                    : []
                }
                reposts={
                  Array.isArray(childItem.reposts)
                    ? childItem.reposts.map((repostedBy: unknown) => String(repostedBy))
                    : []
                }
                isComment
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Page

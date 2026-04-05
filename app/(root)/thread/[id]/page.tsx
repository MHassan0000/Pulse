import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import Comment from "@/components/forms/Comment";
import PostCard from "@/components/feed/PostCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchThreadById } from "@/lib/actions/thread.actions";

export const revalidate = 0;

async function Page({ params }: { params: { id: string } }) {
  if (!params.id) redirect("/");

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const thread = await fetchThreadById(params.id);
  if (!thread) redirect("/");

  const threadId = thread._id?.toString?.() ?? "";
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
  };

  return (
    <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-24 pt-10 md:px-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
        <PostCard
          id={threadData.id}
          currentUserId={user.id}
          parentId={threadData.parentId}
          content={threadData.content}
          author={threadData.author}
          community={threadData.community}
          createdAt={threadData.createdAt}
          comments={threadData.comments}
        />
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
        <Comment
          threadId={params.id}
          currentUserImg={user.imageUrl}
          currentUserId={JSON.stringify(userInfo._id)}
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
              <PostCard
                id={childItem._id?.toString?.() ?? ""}
                currentUserId={user.id}
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

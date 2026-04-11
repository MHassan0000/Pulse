import Pagination from "@/components/layout/Pagination";
import ThreadsTab from "@/components/profile/ThreadsTab";

type ProfileTabPanelProps = {
  currentUserId: string;
  accountId: string;
  mode: "threads" | "replies" | "media";
  pageNumber: number;
  pageSize: number;
  path: string;
};

const ProfileTabPanel = async ({
  currentUserId,
  accountId,
  mode,
  pageNumber,
  pageSize,
  path,
}: ProfileTabPanelProps) => {
  const tabResult = await ThreadsTab({
    currentUserId,
    accountId,
    accountType: "User",
    mode,
    pageNumber,
    pageSize,
  });

  return (
    <>
      {tabResult.content}
      <Pagination
        path={path}
        pageNumber={pageNumber}
        isNext={tabResult.isNext}
        queryKey={
          mode === "threads"
            ? "threadsPage"
            : mode === "replies"
              ? "repliesPage"
              : "mediaPage"
        }
        tabKey="tab"
        tabValue={mode}
        preserveQueryKeys={
          mode === "threads"
            ? ["tab", "repliesPage", "mediaPage"]
            : mode === "replies"
              ? ["tab", "threadsPage", "mediaPage"]
              : ["tab", "threadsPage", "repliesPage"]
        }
      />
    </>
  );
};

export default ProfileTabPanel;


import Bottombar from "@/components/layout/BottomBar";
import LeftSidebar from "@/components/layout/Sidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import Topbar from "@/components/layout/Topbar";

const RootLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white">
      <Topbar />
      <aside className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-[72px] bg-white dark:bg-black md:flex">
        <LeftSidebar />
      </aside>
      <aside className="fixed right-4 top-14 hidden h-[calc(100vh-3.5rem)] w-[320px] bg-white dark:bg-black lg:flex">
        <RightSidebar />
      </aside>
      <main className="pt-14 md:pl-[72px] lg:pr-[340px]">
        <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-[720px] min-h-0 flex-col overflow-hidden px-4 pb-6 pt-6 md:px-6">
          {children}
        </div>
      </main>
      <Bottombar />
    </div>
  );
};

export default RootLayout;


import Bottombar from "@/components/layout/BottomBar";
import ConditionalRightSidebar from "@/components/layout/ConditionalRightSidebar";
import LeftSidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

const RootLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white">
      <Topbar />
      <aside className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-18 bg-white dark:bg-black md:flex">
        <LeftSidebar />
      </aside>
      <ConditionalRightSidebar />
      <main className="pt-14 md:pl-18">
        <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-180 min-h-0 flex-col overflow-hidden px-4 pb-6 pt-6 md:px-6">
          {children}
        </div>
      </main>
      <Bottombar />
    </div>
  );
};

export default RootLayout;

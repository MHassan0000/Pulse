import Bottombar from "@/components/layout/BottomBar";
import LeftSidebar from "@/components/layout/Sidebar";
import RootViewport from "@/components/layout/RootViewport";
import Topbar from "@/components/layout/Topbar";

export const dynamic = "force-dynamic";

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
      <RootViewport>{children}</RootViewport>
      <Bottombar />
    </div>
  );
};

export default RootLayout;

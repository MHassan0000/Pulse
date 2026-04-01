
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
    <div className="min-h-screen bg-black text-white">
      <Topbar />
      <aside className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-[72px] bg-black md:flex">
        <LeftSidebar />
      </aside>
      <aside className="fixed right-4 top-14 hidden h-[calc(100vh-3.5rem)] w-[320px] bg-black lg:flex">
        <RightSidebar />
      </aside>
      <main className="pt-14 md:pl-[72px] lg:pr-[332px]">
        <div className="mx-auto h-[calc(100vh-3.5rem)] w-full max-w-[700px] overflow-y-auto overflow-x-hidden px-4 pb-24 pt-6 md:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </main>
      <Bottombar />
    </div>
  );
};

export default RootLayout;

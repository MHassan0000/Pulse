
import Bottombar from "@/components/Bottombar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import Topbar from "@/components/Topbar";

const RootLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen bg-black text-white [background:radial-gradient(1200px_circle_at_top,#111111_0%,#000000_55%)]">
      <Topbar />
      <div className="mx-auto flex w-full max-w-[1240px] gap-6 px-4 pb-24 pt-6 md:px-6 lg:pb-8">
        <aside className="hidden w-60 shrink-0 md:block">
          <LeftSidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <RightSidebar />
        </aside>
      </div>
      <Bottombar />
    </div>
  );
};

export default RootLayout;

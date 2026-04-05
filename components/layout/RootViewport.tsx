"use client";

import { usePathname } from "next/navigation";

import RightSidebar from "@/components/layout/RightSidebar";

type RootViewportProps = {
  children: React.ReactNode;
};

const RootViewport = ({ children }: RootViewportProps) => {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <>
      {isHomePage ? (
        <aside className="fixed right-4 top-14 hidden h-[calc(100vh-3.5rem)] w-[320px] bg-white dark:bg-black lg:flex">
          <RightSidebar />
        </aside>
      ) : null}

      <main className={`pt-14 md:pl-18 ${isHomePage ? "lg:pr-85" : ""}`}>
        <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-180 min-h-0 flex-col overflow-hidden px-4 pb-6 pt-6 md:px-6">
          {children}
        </div>
      </main>
    </>
  );
};

export default RootViewport;

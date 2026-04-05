"use client";

import { usePathname } from "next/navigation";

import RightSidebar from "@/components/layout/RightSidebar";

const ConditionalRightSidebar = () => {
  const pathname = usePathname();

  const isHomePage = pathname === "/";
  if (!isHomePage) return null;

  return (
    <aside className="fixed right-4 top-14 hidden h-[calc(100vh-3.5rem)] w-[320px] bg-white dark:bg-black lg:flex">
      <RightSidebar />
    </aside>
  );
};

export default ConditionalRightSidebar;

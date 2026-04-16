"use client";

import { Bell, Home, Plus, Search, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const BottomBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { userId } = useAuth();

  const items = [
    { icon: Home, path: "/" },
    { icon: Search, path: "/search" },
    { icon: Plus, path: "/create" },
    { icon: Bell, path: "/activity" },
    { icon: User, path: userId ? `/profile/${userId}` : "/sign-in" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-black md:hidden">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-around px-6">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => router.push(item.path)}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-900 ${(item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)) ? "bg-zinc-200/70 dark:bg-zinc-900/60" : ""
              }`}
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomBar;

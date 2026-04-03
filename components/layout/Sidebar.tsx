"use client";


import {
  AlignJustify,
  Heart,
  Home,
  Globe,
  Plus,
  Search,
  User,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
const navItems = [
  { label: "Home", icon: Home, active: true, path: "/" },
  { label: "Search", icon: Search, path: "/search" },
  { label: "Create", icon: Plus, path: "/create" },
  { label: "Activity", icon: Heart, path: "/activity" },
  { label: "Profile", icon: User, path: "/profile" },
];

const Sidebar = () => {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="relative flex h-full w-full flex-col items-center py-6">

      <nav className="mt-10 flex flex-1 flex-col items-center justify-center gap-4">
        {navItems.map((item) => (
          <motion.button
            key={item.label}
            className={`flex items-center justify-center rounded-2xl px-3 py-3 text-zinc-700 transition-all duration-200 hover:bg-zinc-100 cursor-pointer dark:text-zinc-200 dark:hover:bg-zinc-900 ${item.active ? "bg-zinc-200/70 dark:bg-zinc-900/60" : ""
              }`}
            aria-label={item.label}
            title={item.label}
            onClick={() => router.push(item.path)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <item.icon className="h-5 w-5" />
          </motion.button>
        ))}
      </nav>
      <div className="grid gap-3 pb-2">
        <Link href="/communities">
          <motion.button
            className="flex items-center justify-center rounded-2xl px-3 py-3 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
            aria-label="Saved"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <Globe className="h-5 w-5" />
          </motion.button>
        </Link>
        <motion.button
          className="flex items-center justify-center rounded-2xl px-3 py-3 cursor-pointer text-zinc-500 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          aria-label="More"
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setAppearanceOpen(false);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
        >
          <AlignJustify className="h-5 w-5" />
        </motion.button>
      </div>
      {menuOpen && (
        <div className="absolute bottom-16 left-16 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-[#1f1f1f] dark:bg-[#111111] z-50 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200">
          <button
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={() => setAppearanceOpen((prev) => !prev)}
          >
            <span>Appearance</span>
            <span className="text-xs text-zinc-500 capitalize">
              {theme}
            </span>
          </button>

          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              appearanceOpen ? "max-h-32 mt-2 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="grid gap-1">
              <button
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                  theme === "light"
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                )}
                onClick={() => setTheme("light")}
              >
                Light
              </button>
              <button
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                  theme === "dark"
                    ? "bg-zinc-900 text-white dark:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                )}
                onClick={() => setTheme("dark")}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

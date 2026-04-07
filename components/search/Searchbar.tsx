"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SearchbarProps = {
  routeType?: "search" | "users";
};

const Searchbar = ({ routeType = "search" }: SearchbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const initialQuery = useMemo(() => searchParams.get("q") ?? "", [searchParams]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const navigateWithQuery = useCallback((value: string) => {
    const trimmed = value.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (trimmed) {
      params.set("q", trimmed);
      params.set("page", "1");
    } else {
      params.delete("q");
      params.delete("page");
    }

    const targetPath = routeType === "search" ? "/search" : pathname;
    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `${targetPath}?${queryString}` : targetPath);
    });
  }, [pathname, routeType, router, searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (query === initialQuery) return;
      navigateWithQuery(query);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query, initialQuery, navigateWithQuery]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigateWithQuery(query);
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search users by name or username"
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-20 text-sm text-zinc-800 outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-zinc-300 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {isPending ? "Searching..." : "Search"}
      </button>
    </form>
  );
};

export default Searchbar;

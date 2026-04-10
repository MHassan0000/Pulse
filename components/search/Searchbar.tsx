"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SearchbarProps = {
  routeType?: "search" | "users" | "communities";
};

const Searchbar = ({ routeType = "search" }: SearchbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const urlQuery = useMemo(
    () => (searchParams.get("q") ?? "").trim(),
    [searchParams]
  );

  const navigateWithQuery = useCallback(
    (rawValue: string) => {
      const value = rawValue ?? "";
      const trimmed = value.trim();
      const params = new URLSearchParams(searchParams.toString());

      if (trimmed) {
        params.set("q", trimmed);
        params.set("page", "1");
      } else {
        params.delete("q");
        params.delete("page");
      }

      const targetPath =
        routeType === "search"
          ? "/search"
          : routeType === "communities"
            ? "/communities"
            : pathname;
      const queryString = params.toString();
      const targetUrl = queryString ? `${targetPath}?${queryString}` : targetPath;
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      if (targetUrl === currentUrl) return;

      router.replace(targetUrl, { scroll: false });
    },
    [pathname, routeType, router, searchParams]
  );

  useEffect(() => {
    if (!inputRef.current) return;
    if (document.activeElement === inputRef.current) return;

    inputRef.current.value = urlQuery;
  }, [urlQuery]);

  const scheduleSearch = (value: string) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      navigateWithQuery(value);
    }, 380);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    navigateWithQuery(inputRef.current?.value ?? "");
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        ref={inputRef}
        defaultValue={urlQuery}
        onChange={(event) => scheduleSearch(event.target.value)}
        placeholder={
          routeType === "communities"
            ? "Search communities by name or handle"
            : "Search users by name or username"
        }
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-20 text-sm text-zinc-800 outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-zinc-300 dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-100 dark:border-[#2a2a2a] dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Search
      </button>
    </form>
  );
};

export default Searchbar;

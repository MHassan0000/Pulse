"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "../ui/button";

interface Props {
  pageNumber: number;
  isNext: boolean;
  path: string;
  queryKey?: string;
  tabKey?: string;
  tabValue?: string;
  preserveQueryKeys?: string[];
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function Pagination({
  pageNumber,
  isNext,
  path,
  queryKey = "page",
  tabKey,
  tabValue,
  preserveQueryKeys,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNavigation = (type: string) => {
    let nextPageNumber = pageNumber;

    if (type === "prev") {
      nextPageNumber = Math.max(1, pageNumber - 1);
    } else if (type === "next") {
      nextPageNumber = pageNumber + 1;
    }

    const params = new URLSearchParams();

    if (preserveQueryKeys?.length) {
      preserveQueryKeys.forEach((key) => {
        const value = searchParams.get(key);
        if (value) {
          params.set(key, value);
        }
      });
    } else {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    if (isNonEmptyString(tabKey) && isNonEmptyString(tabValue)) {
      params.set(tabKey, tabValue);
    }

    if (nextPageNumber > 1) {
      params.set(queryKey, String(nextPageNumber));
    } else {
      params.delete(queryKey);
    }

    const query = params.toString();
    const basePath = path.startsWith("/") ? path : `/${path}`;
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  if (!isNext) return null;

  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <Button
        onClick={() => handleNavigation("prev")}
        disabled={pageNumber === 1}
        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 dark:border-[#1f1f1f] dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Prev
      </Button>
      <p className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-300">
        {pageNumber}
      </p>
      <Button
        onClick={() => handleNavigation("next")}
        disabled={!isNext}
        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 dark:border-[#1f1f1f] dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Next
      </Button>
    </div>
  );
}

export default Pagination;

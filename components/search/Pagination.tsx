"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

type PaginationProps = {
  path: string;
  pageNumber: number;
  isNext: boolean;
};

const Pagination = ({ path, pageNumber, isNext }: PaginationProps) => {
  const searchParams = useSearchParams();

  if (!isNext && pageNumber === 1) return null;

  const createHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }

    const query = params.toString();
    return query ? `/${path}?${query}` : `/${path}`;
  };

  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <Link
        href={createHref(Math.max(1, pageNumber - 1))}
        className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
          pageNumber === 1
            ? "pointer-events-none border-zinc-200 text-zinc-400 dark:border-[#1f1f1f] dark:text-zinc-600"
            : "border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:text-zinc-200 dark:hover:bg-zinc-900"
        }`}
      >
        Prev
      </Link>

      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-300">
        {pageNumber}
      </span>

      <Link
        href={createHref(pageNumber + 1)}
        className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
          !isNext
            ? "pointer-events-none border-zinc-200 text-zinc-400 dark:border-[#1f1f1f] dark:text-zinc-600"
            : "border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:text-zinc-200 dark:hover:bg-zinc-900"
        }`}
      >
        Next
      </Link>
    </div>
  );
};

export default Pagination;

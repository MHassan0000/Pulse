"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page-scroll h-full overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Please try again. If the issue persists, share this digest with support.
          </p>
          {error?.digest ? (
            <p className="mt-2 text-xs text-zinc-400">Digest: {error.digest}</p>
          ) : null}
          <button
            onClick={reset}
            className="mt-6 cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-100 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Try again
          </button>
        </div>
      </div>
    </section>
  );
}

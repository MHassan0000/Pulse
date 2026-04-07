export default function Loading() {
  return (
    <section className="page-scroll h-full overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] md:p-8">
          <div className="mb-8 h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-12 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          <div className="mt-8 flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-[#1f1f1f] dark:bg-black"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

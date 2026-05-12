// BOSCardSkeleton: loading shimmer that matches the final BOSCard layout.
// Rendered while the react-query hook is in its first isLoading window.
// No animation libraries; a pure Tailwind animate-pulse stack so it can
// render under any environment without JS bookkeeping.

export function BOSCardSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading Bio Optimization Score"
      className="rounded-3xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-5 sm:p-6 md:p-8"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <div className="flex flex-col items-center md:items-start">
          <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-20 w-32 animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-3 h-3 w-20 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </section>
  );
}

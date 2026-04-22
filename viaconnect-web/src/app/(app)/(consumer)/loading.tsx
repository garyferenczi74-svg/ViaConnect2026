// Next.js 14 App Router loading boundary for every route under
// src/app/(app)/(consumer)/. Shown while the route segment's async
// component tree resolves on first navigation. Pages may override by
// adding their own loading.tsx in a nested segment.
//
// Layout intent: a generic skeleton shaped like a typical consumer
// page (heading + hero card + two-column grid + supporting row) so
// the shape-of-content signals intent before the real content paints.

export default function ConsumerLoading(): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-[#0E1A30] text-white">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6">
        {/* Page heading */}
        <div className="h-10 w-2/3 md:w-1/3 animate-pulse rounded-xl bg-white/5" />

        {/* Hero card */}
        <div className="glass-panel h-[260px] md:h-[300px] animate-pulse" />

        {/* Two-column grid */}
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="glass-panel h-[360px] animate-pulse" />
          <div className="glass-panel h-[360px] animate-pulse" />
        </div>

        {/* Supporting row */}
        <div className="glass-panel h-[160px] animate-pulse" />

        {/* Footer strip */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="glass-panel h-[200px] animate-pulse" />
          <div className="glass-panel h-[200px] animate-pulse" />
          <div className="glass-panel h-[200px] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

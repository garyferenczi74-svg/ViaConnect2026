export default function HounddogLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1E3054] animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-[#1E3054] animate-pulse" />
          <div className="h-3 w-64 rounded bg-[#1E3054] animate-pulse" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#1A2744] animate-pulse" />
              <div className="h-3 w-20 rounded bg-[#1A2744] animate-pulse" />
            </div>
            <div className="h-7 w-16 rounded bg-[#1A2744] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-6 space-y-4"
          >
            <div className="h-4 w-32 rounded bg-[#1A2744] animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="h-12 rounded-lg bg-[#1A2744] animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

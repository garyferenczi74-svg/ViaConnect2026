import { Cpu, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white">Agents</h1>
          <p className="text-xs text-white/40 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
            Loading registry, heartbeats, and tasks
          </p>
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-28 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-[#1E3054] rounded-xl border border-white/[0.08] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

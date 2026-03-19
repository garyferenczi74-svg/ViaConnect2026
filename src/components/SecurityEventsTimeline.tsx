"use client";

import { SecurityEvent, SEVERITY_STYLES } from "@/data/compliance";

interface SecurityEventsTimelineProps {
  events: SecurityEvent[];
}

export default function SecurityEventsTimeline({ events }: SecurityEventsTimelineProps) {
  const criticalCount = events.filter((e) => e.severity === "critical").length;

  return (
    <div className="glass-card p-6 rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest font-medium">
            Security Events
          </h3>
          <p className="text-xl font-bold text-[#dce2f7] mt-1">Threat Monitor</p>
        </div>
        {criticalCount > 0 && (
          <span className="bg-[#f87171]/10 text-[#f87171] text-[10px] font-black px-3 py-1 rounded-full border border-[#f87171]/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse" />
            {criticalCount} CRITICAL
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#2e3545 transparent" }}>
        {events.map((event) => {
          const style = SEVERITY_STYLES[event.severity];
          return (
            <div
              key={event.id}
              className={`${style.border} ${style.bg} rounded-r-xl p-4 transition-colors hover:brightness-110`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0 ${event.severity === "critical" ? "animate-pulse" : ""}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
                    {style.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#dce2f7]/30">
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#dce2f7] mb-1.5">{event.title}</h4>
              <p className="text-xs text-[#dce2f7]/50 leading-relaxed mb-2">{event.description}</p>
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-[#dce2f7]/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                </svg>
                <span className="text-[10px] font-mono text-[#dce2f7]/25">{event.source}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(107, 251, 154, 0.15);
        }
      `}</style>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
}

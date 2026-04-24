"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Info, CheckCircle2, AlertTriangle, XCircle, Copy, ChevronDown, ChevronRight } from "lucide-react";
import type { AgentActivityEvent, AgentEventSeverity } from "@/lib/agents/types";

const SEVERITY_ICON: Record<AgentEventSeverity, React.ElementType> = {
  info:    Info,
  success: CheckCircle2,
  warn:    AlertTriangle,
  error:   XCircle,
};

const SEVERITY_BORDER: Record<AgentEventSeverity, string> = {
  info:    "border-l-blue-400/70",
  success: "border-l-emerald-400/70",
  warn:    "border-l-amber-300/80",
  error:   "border-l-red-400/80",
};

// Minimal custom virtualizer (no react-window dep per package.json lock).
// Renders first 30 events by default; "Show older" reveals next 30 in-place.
const PAGE_SIZE = 30;

function relativeTime(iso: string, now: number = Date.now()): string {
  const delta = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86_400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86_400)}d ago`;
}

export default function AgentActivityFeed({ events }: { events: AgentActivityEvent[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (events.length === 0) {
    return (
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Activity</h3>
        </div>
        <p className="text-xs text-white/40">No activity in the last 24 hours.</p>
      </div>
    );
  }

  const visible = events.slice(0, visibleCount);

  const copyRow = async (e: AgentActivityEvent) => {
    const text = `[${e.created_at}] ${e.event_type} ${e.severity}: ${e.message}\n${JSON.stringify(e.metadata, null, 2)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // best-effort
    }
  };

  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Activity</h3>
        <span className="text-[10px] text-white/40 ml-auto">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>
      <ol className="space-y-2">
        {visible.map((e) => {
          const Icon = SEVERITY_ICON[e.severity];
          const hasMetadata = e.metadata && Object.keys(e.metadata).length > 0;
          const isOpen = !!expanded[e.id];
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`bg-[#0F172A] rounded-lg p-3 border-l-2 ${SEVERITY_BORDER[e.severity]}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className="w-3.5 h-3.5 text-white/70 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-[10px] uppercase text-white/40 tracking-wide">{e.event_type.replace(/_/g, " ")}</span>
                <time
                  className="text-[10px] text-white/30 ml-auto"
                  dateTime={e.created_at}
                  title={new Date(e.created_at).toLocaleString()}
                >
                  {relativeTime(e.created_at)}
                </time>
                <button
                  onClick={() => copyRow(e)}
                  className="p-1 rounded text-white/40 hover:text-white/70 hover:bg-white/5"
                  aria-label="Copy event"
                  type="button"
                >
                  <Copy className="w-3 h-3" strokeWidth={1.5} />
                </button>
                {hasMetadata && (
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                    className="p-1 rounded text-white/40 hover:text-white/70 hover:bg-white/5"
                    aria-label={isOpen ? "Hide metadata" : "Show metadata"}
                    aria-expanded={isOpen}
                    type="button"
                  >
                    {isOpen ? <ChevronDown className="w-3 h-3" strokeWidth={1.5} /> : <ChevronRight className="w-3 h-3" strokeWidth={1.5} />}
                  </button>
                )}
              </div>
              <p className="text-xs text-white/80 mt-1">{e.message}</p>
              {hasMetadata && isOpen && (
                <pre className="text-[11px] text-white/60 bg-black/20 rounded p-2 mt-2 overflow-x-auto">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              )}
            </motion.li>
          );
        })}
      </ol>
      {visibleCount < events.length && (
        <div className="text-center mt-3">
          <button
            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, events.length))}
            className="px-3 py-1.5 rounded-lg text-xs text-white/70 bg-white/5 hover:bg-white/10"
            type="button"
          >
            Show older
          </button>
        </div>
      )}
    </div>
  );
}

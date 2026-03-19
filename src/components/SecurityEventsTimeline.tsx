"use client";

import { SecurityEvent, SEVERITY_STYLES } from "@/data/compliance";

interface SecurityEventsTimelineProps {
  events: SecurityEvent[];
}

export default function SecurityEventsTimeline({ events }: SecurityEventsTimelineProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold px-2">Critical Events</h3>
      {events.map((event) => {
        const style = SEVERITY_STYLES[event.severity];
        return (
          <div
            key={event.id}
            className={`glass-card p-4 rounded-xl ${style.border}`}
          >
            <div className="flex gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${style.iconBg}` }}
              >
                <svg className="w-5 h-5" style={{ color: style.iconColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={style.iconPath} />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold">{event.title}</p>
                <p className="text-xs text-[#bccabb] mb-1">{event.description}</p>
                <span className="text-[10px] font-mono text-[#bccabb]/50 uppercase">
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(134, 148, 134, 0.15);
        }
      `}</style>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} mins ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hours ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
}

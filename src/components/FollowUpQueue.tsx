"use client";

import { FollowUp, URGENCY_STYLES } from "@/data/schedule";

interface FollowUpQueueProps {
  followUps: FollowUp[];
  onScheduleFollowUp: (followUp: FollowUp) => void;
}

export default function FollowUpQueue({ followUps, onScheduleFollowUp }: FollowUpQueueProps) {
  const sorted = [...followUps].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const overdueCount = sorted.filter((f) => f.urgency === "overdue").length;

  return (
    <div className="w-72 shrink-0 glass-card rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {/* Header */}
      <div className="p-4 border-b border-[#3d4a3e]/15">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#dce2f7]">
            Upcoming Follow-ups
          </h3>
          <span className="bg-[#4ade80]/10 text-[#4ade80] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#4ade80]/20">
            {followUps.length}
          </span>
        </div>
        {overdueCount > 0 && (
          <div className="mt-2 flex items-center gap-2 bg-[#f87171]/5 rounded-lg px-3 py-1.5 border border-[#f87171]/10">
            <svg className="w-3.5 h-3.5 text-[#f87171]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-[10px] font-bold text-[#f87171]">{overdueCount} overdue</span>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#3d4a3e transparent" }}>
        {sorted.map((fu) => {
          const urgStyle = URGENCY_STYLES[fu.urgency];
          return (
            <div
              key={fu.id}
              className="p-3 rounded-xl hover:bg-[#232a3a]/60 transition-colors cursor-pointer group"
              onClick={() => onScheduleFollowUp(fu)}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-sm font-bold text-[#dce2f7] truncate">{fu.patientName}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${urgStyle.bg} ${urgStyle.text}`}>
                  {fu.urgency === "overdue"
                    ? `${Math.abs(fu.daysUntilDue)}d overdue`
                    : fu.urgency === "due-soon"
                    ? `${fu.daysUntilDue}d left`
                    : `in ${fu.daysUntilDue}d`}
                </span>
              </div>
              <div className="text-[11px] text-[#dce2f7]/40 truncate mb-2">{fu.protocol}</div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#dce2f7]/25">
                  Last: {formatShortDate(fu.lastVisit)}
                </span>
                <button className="text-[10px] font-bold uppercase tracking-widest text-[#4ade80]/0 group-hover:text-[#4ade80] transition-all flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Schedule
                </button>
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

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

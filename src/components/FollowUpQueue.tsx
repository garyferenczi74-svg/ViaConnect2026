"use client";

import { FollowUp, URGENCY_STYLES } from "@/data/schedule";

interface FollowUpQueueProps {
  followUps: FollowUp[];
  onScheduleFollowUp: (followUp: FollowUp) => void;
}

const urgencyBadge: Record<string, { bg: string; text: string }> = {
  overdue: { bg: "bg-[#ffb4ab] text-[#690005]", text: "text-[#690005]" },
  "due-soon": { bg: "bg-[#ffb657] text-[#734700]", text: "text-[#734700]" },
  upcoming: { bg: "bg-[#6bfb9a]/20 text-[#6bfb9a]", text: "text-[#6bfb9a]" },
};

export default function FollowUpQueue({ followUps, onScheduleFollowUp }: FollowUpQueueProps) {
  const sorted = [...followUps].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const pendingCount = sorted.length;

  return (
    <div className="space-y-6">
      {/* Follow-up Queue Card */}
      <div className="bg-[#141b2b] rounded-3xl p-6 border border-[#3d4a3e]/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Follow-up Queue</h3>
          <span className="bg-[#ffb4ab]/10 text-[#ffb4ab] text-[10px] font-black px-2 py-0.5 rounded-full">
            {pendingCount} PENDING
          </span>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#2e3545 transparent" }}>
          {sorted.map((fu, idx) => {
            const badge = urgencyBadge[fu.urgency];
            const isLast = idx === sorted.length - 1;
            const hoverBorder = fu.urgency === "overdue" ? "hover:border-[#ffb4ab]/30" : fu.urgency === "due-soon" ? "hover:border-[#ffb657]/30" : "hover:border-[#6bfb9a]/30";
            const scheduleHoverBg = fu.urgency === "overdue" ? "group-hover:bg-[#ffb4ab] group-hover:text-[#690005]" : fu.urgency === "due-soon" ? "group-hover:bg-[#ffb657] group-hover:text-[#734700]" : "group-hover:bg-[#6bfb9a] group-hover:text-[#003919]";

            return (
              <div
                key={fu.id}
                className={`p-4 rounded-2xl bg-[#232a3a]/50 border border-[#3d4a3e]/5 ${hoverBorder} transition-colors group ${isLast ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`${badge.bg} text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-tighter`}>
                    {fu.urgency === "overdue" ? "Overdue" : fu.urgency === "due-soon" ? "Due Soon" : "Upcoming"}
                  </span>
                  <span className="font-mono text-[9px] text-[#dce2f7]/40">
                    {fu.urgency === "overdue"
                      ? `${Math.abs(fu.daysUntilDue)}D AGO`
                      : fu.urgency === "due-soon"
                      ? `${fu.daysUntilDue}D LEFT`
                      : formatShortDate(fu.lastVisit).toUpperCase()}
                  </span>
                </div>
                <p className="font-bold text-sm">{fu.patientName}</p>
                <p className="text-xs text-[#dce2f7]/50 mt-1">{fu.protocol}</p>
                {!isLast && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onScheduleFollowUp(fu)}
                      className={`flex-1 bg-[#2e3545] py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${scheduleHoverBg} transition-all`}
                    >
                      Schedule
                    </button>
                    <button className="p-1.5 bg-[#2e3545] rounded-lg hover:bg-[#3d4a3e] transition-colors">
                      <svg className="w-4 h-4 text-[#dce2f7]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Efficiency Score Card */}
      <div className="bg-[#a78bfa]/10 rounded-3xl p-6 border border-[#a78bfa]/20 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[#a78bfa] text-[10px] font-black uppercase tracking-widest mb-1">Efficiency Score</p>
          <h4 className="text-3xl font-black text-[#dce2f7]">94.2%</h4>
          <p className="text-xs text-[#dce2f7]/50 mt-2 font-mono">+2.4% FROM LAST WEEK</p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <svg className="w-20 h-20 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

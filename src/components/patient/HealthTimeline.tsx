"use client";

const events = [
  { date: "Mar 17, 2026", title: "Protocol adjustment", desc: "Increased Methylfolate to 15mg based on MTHFR status" },
  { date: "Mar 10, 2026", title: "Lab results received", desc: "Homocysteine levels improved from 14.2 to 10.8 µmol/L" },
  { date: "Feb 28, 2026", title: "Genomic report completed", desc: "GX360 panel — 3 actionable variants identified" },
  { date: "Feb 15, 2026", title: "Initial consultation", desc: "Comprehensive intake, constitutional assessment, vitals baseline" },
  { date: "Feb 1, 2026", title: "Patient registered", desc: "Referral from Dr. Patel — primary concerns: fatigue, brain fog" },
];

export default function HealthTimeline() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-5">Health Timeline</h3>
      <div className="border-l-2 border-green-400/20 ml-3 space-y-6">
        {events.map((e, i) => (
          <div key={i} className="relative pl-6">
            <span className="absolute -left-[5px] top-1.5 w-2 h-2 bg-green-400 rounded-full" />
            <p className="text-xs text-white/40 mb-0.5">{e.date}</p>
            <p className="text-sm font-medium text-white">{e.title}</p>
            <p className="text-xs text-white/50 mt-0.5">{e.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AssessmentRecord } from "@/data/assessment";

interface AssessmentTimelineProps {
  history: AssessmentRecord[];
}

const phaseLabels = ["Vata Unstable", "Equilibrium Sync", "Peak Resilience", "Scheduled"];

export default function AssessmentTimeline({ history }: AssessmentTimelineProps) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const isComparing = compareIds.length === 2;

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareRecords = isComparing
    ? history.filter((r) => compareIds.includes(r.id))
    : null;

  // Calculate progress fill widths for timeline
  const maxScore = Math.max(...history.map((r) => r.overallScore));

  return (
    <div className="glass-card p-8 rounded-3xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest font-medium">
            Assessment History
          </h3>
          <p className="text-[#dce2f7] font-bold text-xl mt-1">Temporal Vitality Flow</p>
        </div>
        <div className="flex items-center gap-3">
          {isComparing && (
            <button
              onClick={() => setCompareIds([])}
              className="text-xs text-[#dce2f7]/40 hover:text-[#6bfb9a] transition-colors font-mono uppercase tracking-widest"
            >
              Clear
            </button>
          )}
          <button className="bg-[#6bfb9a] text-[#003919] px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
            Export Clinical Log
          </button>
        </div>
      </div>

      {/* Comparison Panel */}
      {isComparing && compareRecords && (
        <div className="mb-8 bg-purple-500/5 border border-purple-500/15 rounded-2xl p-6">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400 mb-4">
            Side-by-Side Comparison
          </h4>
          <div className="grid grid-cols-2 gap-8">
            {compareRecords.map((record) => (
              <div key={record.id}>
                <p className="text-[10px] font-mono text-[#dce2f7]/40 mb-1">
                  {formatDate(record.date).toUpperCase()}
                </p>
                <p className="text-2xl font-black text-[#6bfb9a] mb-3">
                  {record.overallScore}<span className="text-sm text-[#dce2f7]/30">/100</span>
                </p>
                <div className="space-y-1.5">
                  {record.dimensions.map((dim) => {
                    const color = dim.score >= 7 ? "bg-[#6bfb9a]" : dim.score >= 4 ? "bg-[#ffb657]" : "bg-[#ffb4ab]";
                    return (
                      <div key={dim.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#dce2f7]/40 font-mono w-20 truncate">{dim.label}</span>
                        <div className="flex-1 h-1.5 bg-[#2e3545] rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${(dim.score / dim.maxScore) * 100}%`, transition: "width 0.5s" }} />
                        </div>
                        <span className="text-[10px] font-mono text-[#dce2f7]/40 w-4 text-right">{dim.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-purple-500/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-2">Changes</p>
            <div className="flex flex-wrap gap-2">
              {compareRecords[0].dimensions.map((dim, i) => {
                const delta = compareRecords[0].dimensions[i].score - compareRecords[1].dimensions[i].score;
                if (delta === 0) return null;
                return (
                  <span key={dim.label} className={`text-[10px] font-mono px-2 py-1 rounded-full ${delta > 0 ? "bg-[#6bfb9a]/10 text-[#6bfb9a]" : "bg-[#ffb4ab]/10 text-[#ffb4ab]"}`}>
                    {dim.label}: {delta > 0 ? "+" : ""}{delta}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Timeline */}
      <div className="relative overflow-x-auto">
        <div className="flex gap-8 pb-4 min-w-[700px]">
          {history.map((record, idx) => {
            const isLast = idx === history.length - 1;
            const isSelected = compareIds.includes(record.id);
            const fillPercent = (record.overallScore / 100) * 100;
            const delta = record.previousScore !== null ? record.overallScore - record.previousScore : null;

            return (
              <div key={record.id} className="flex-1 relative flex flex-col gap-4">
                {/* Progress bar */}
                <div className="h-1 w-full bg-[#2e3545] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6bfb9a] rounded-full"
                    style={{
                      width: `${fillPercent}%`,
                      opacity: isLast && !record.previousScore ? 0 : 0.4 + (idx / history.length) * 0.6,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>

                <div>
                  <div className="text-[10px] font-mono text-[#dce2f7]/40 mb-1">
                    {formatDate(record.date).toUpperCase()}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-[#6bfb9a]">{record.overallScore}</span>
                    {delta !== null && (
                      <span className={`text-[10px] font-mono font-bold ${delta > 0 ? "text-[#6bfb9a]" : delta < 0 ? "text-[#ffb4ab]" : "text-[#dce2f7]/30"}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase text-[#dce2f7]/60">
                    {phaseLabels[idx] ?? "Assessment"}
                  </div>
                </div>

                {/* Compare button */}
                <button
                  onClick={() => toggleCompare(record.id)}
                  className={`mt-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all w-fit ${
                    isSelected
                      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                      : "text-[#dce2f7]/30 border-[#3d4a3e]/20 hover:text-purple-400 hover:border-purple-500/30"
                  }`}
                >
                  {isSelected ? "Selected" : "Compare"}
                </button>
              </div>
            );
          })}

          {/* Scheduled future entry */}
          <div className="flex-1 relative flex flex-col gap-4 opacity-30">
            <div className="h-1 w-full bg-[#2e3545] rounded-full overflow-hidden" />
            <div>
              <div className="text-[10px] font-mono text-[#dce2f7]/40 mb-1">APR 15, 2026</div>
              <div className="text-lg font-black">--</div>
              <div className="text-[10px] uppercase">Scheduled</div>
            </div>
          </div>
        </div>
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

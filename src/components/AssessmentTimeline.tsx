"use client";

import { useState } from "react";
import { AssessmentRecord } from "@/data/assessment";

interface AssessmentTimelineProps {
  history: AssessmentRecord[];
}

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

  return (
    <div
      className="rounded-2xl border border-[#3d4a3e]/15 p-6"
      style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-1">
            Assessment History
          </h3>
          <p className="text-[10px] text-[#bccabb]/60 font-mono uppercase tracking-widest">
            Longitudinal Progress Tracking
          </p>
        </div>
        {compareIds.length > 0 && !isComparing && (
          <span className="text-[10px] text-purple-400 font-mono">
            Select {2 - compareIds.length} more to compare
          </span>
        )}
        {isComparing && (
          <button
            onClick={() => setCompareIds([])}
            className="text-xs text-[#bccabb]/60 hover:text-[#4ade80] transition-colors"
          >
            Clear comparison
          </button>
        )}
      </div>

      {/* Comparison Panel */}
      {isComparing && compareRecords && (
        <div className="mb-8 bg-purple-500/5 border border-purple-500/15 rounded-xl p-5">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400 mb-4">
            Side-by-Side Comparison
          </h4>
          <div className="grid grid-cols-2 gap-6">
            {compareRecords.map((record) => (
              <div key={record.id}>
                <p className="text-xs font-bold text-[#dce2f7] mb-1">
                  {formatDate(record.date)}
                </p>
                <p className="text-2xl font-black text-[#4ade80] mb-3">
                  {record.overallScore}<span className="text-sm text-[#bccabb]/40">/100</span>
                </p>
                <div className="space-y-1.5">
                  {record.dimensions.map((dim) => {
                    const color = dim.score >= 7 ? "bg-[#4ade80]" : dim.score >= 4 ? "bg-yellow-400" : "bg-red-400";
                    return (
                      <div key={dim.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#bccabb]/50 font-mono w-20 truncate">
                          {dim.label}
                        </span>
                        <div className="flex-1 h-1.5 bg-[#2e3545] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full`}
                            style={{ width: `${(dim.score / dim.maxScore) * 100}%`, transition: "width 0.5s ease" }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[#bccabb]/50 w-4 text-right">
                          {dim.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Deltas */}
          <div className="mt-4 pt-4 border-t border-purple-500/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-2">
              Changes
            </p>
            <div className="flex flex-wrap gap-2">
              {compareRecords[0].dimensions.map((dim, i) => {
                const delta = compareRecords[0].dimensions[i].score - compareRecords[1].dimensions[i].score;
                if (delta === 0) return null;
                const isPositive = delta > 0;
                return (
                  <span
                    key={dim.label}
                    className={`text-[10px] font-mono px-2 py-1 rounded-full ${
                      isPositive ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {dim.label}: {isPositive ? "+" : ""}{delta}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[#3d4a3e]/30" />

        <div className="space-y-8">
          {history.map((record, idx) => {
            const delta = record.previousScore !== null ? record.overallScore - record.previousScore : null;
            const isSelected = compareIds.includes(record.id);
            const scoreColor = record.overallScore >= 70 ? "text-[#4ade80]" : record.overallScore >= 40 ? "text-yellow-400" : "text-red-400";

            return (
              <div key={record.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                  isSelected
                    ? "bg-purple-500/20 border-purple-400"
                    : idx === 0
                    ? "bg-[#4ade80]/10 border-[#4ade80]/40"
                    : "bg-[#2e3545] border-[#3d4a3e]/30"
                }`}>
                  <span className={`text-xs font-black ${isSelected ? "text-purple-400" : scoreColor}`}>
                    {record.overallScore}
                  </span>
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 pb-2 rounded-xl p-4 border transition-colors ${
                  isSelected
                    ? "bg-purple-500/5 border-purple-500/20"
                    : "bg-transparent border-transparent"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-bold text-[#dce2f7]">
                        {formatDate(record.date)}
                      </p>
                      {idx === 0 && (
                        <span className="text-[8px] font-bold uppercase tracking-widest bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
                      {delta !== null && (
                        <span className={`text-[10px] font-mono font-bold ${delta > 0 ? "text-[#4ade80]" : delta < 0 ? "text-red-400" : "text-[#bccabb]/40"}`}>
                          {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "—"}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleCompare(record.id)}
                      className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                        isSelected
                          ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                          : "bg-transparent text-[#bccabb]/40 border-[#3d4a3e]/20 hover:text-purple-400 hover:border-purple-500/30"
                      }`}
                    >
                      {isSelected ? "Selected" : "Compare"}
                    </button>
                  </div>
                  <p className="text-xs text-[#bccabb]/70 leading-relaxed">{record.notes}</p>

                  {/* Mini dimension bars */}
                  <div className="flex gap-1 mt-3">
                    {record.dimensions.map((dim) => {
                      const barColor = dim.score >= 7 ? "bg-[#4ade80]" : dim.score >= 4 ? "bg-yellow-400" : "bg-red-400";
                      return (
                        <div key={dim.label} className="flex-1 group relative">
                          <div className="h-1.5 bg-[#2e3545] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} rounded-full`}
                              style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                            />
                          </div>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0c1322] border border-[#3d4a3e]/30 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            <p className="text-[9px] text-[#bccabb] font-mono">{dim.label}: {dim.score}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

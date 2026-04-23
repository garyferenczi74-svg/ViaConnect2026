"use client";

import { useState, useEffect, useCallback } from "react";
import { Gavel, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FindingRow {
  id: string;
  finding_id: string;
  rule_id: string;
  severity: string;
  surface: string;
  source: string;
  message: string;
  created_at: string;
  status: string;
}

const SEV_STYLE: Record<string, string> = {
  P0: "bg-red-500/15 text-red-400",
  P1: "bg-orange-500/15 text-orange-400",
  P2: "bg-amber-500/15 text-amber-300",
  P3: "bg-blue-500/15 text-blue-300",
  ADVISORY: "bg-white/10 text-white/60",
};

export default function MarshallBulletinBoard() {
  const [rows, setRows] = useState<FindingRow[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"claude_code" | "runtime" | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const q = supabase
      .from("compliance_findings")
      .select("id, finding_id, rule_id, severity, surface, source, message, created_at, status")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (severityFilter) q.eq("severity", severityFilter);
    if (sourceFilter) q.eq("source", sourceFilter);
    const { data } = await q;
    setRows((data ?? []) as FindingRow[]);
    setLoading(false);
  }, [supabase, severityFilter, sourceFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Gavel className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Marshall Bulletin</h3>
        <span className="text-xs text-white/30 ml-auto">last 48h</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />
        {(["P0", "P1", "P2", "P3", "ADVISORY"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(severityFilter === s ? null : s)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
              severityFilter === s ? SEV_STYLE[s] : "bg-white/5 text-white/40 hover:text-white/60"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="w-px h-4 bg-white/10 mx-1" />
        {(["runtime", "claude_code"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSourceFilter(sourceFilter === s ? null : s)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              sourceFilter === s ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:text-white/60"
            }`}
          >
            {s === "runtime" ? "Runtime" : "Claude Code"}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 && (
        <div className="text-center text-white/30 text-sm py-8">Loading...</div>
      )}
      {!loading && rows.length === 0 && (
        <div className="text-center text-white/30 text-sm py-8">No findings in the last 48 hours.</div>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <a
            key={r.id}
            href={`/admin/marshall/findings/${r.finding_id}`}
            className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEV_STYLE[r.severity] ?? SEV_STYLE.ADVISORY}`}>
                {r.severity}
              </span>
              <span className="text-xs font-mono text-white/60">{r.finding_id}</span>
              <span className="text-[10px] text-white/40">{r.source === "claude_code" ? "Claude Code" : "Runtime"}</span>
              <span className="text-[10px] text-white/30 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs text-white/70 mt-1 line-clamp-2">{r.message}</p>
            <p className="text-[10px] text-white/40 mt-1">{r.rule_id}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

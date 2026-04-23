"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface KnowledgeEntry {
  id: string;
  entry_type: string;
  entry_title: string;
  entry_summary: string | null;
  source_url: string | null;
  source_name: string | null;
  confidence: number | null;
  admin_verified: boolean;
  admin_notes: string | null;
  created_at: string;
}

const ENTRY_TYPES = [
  "all", "pubmed_article", "clinical_trial", "brand_data", "product_update",
  "interaction_rule", "protocol_template", "botanical_monograph", "fda_alert",
  "population_stat", "formulation_data",
];

export default function KnowledgeExplorer() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState<"all" | "verified" | "unverified">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const query = supabase.from("jeffery_knowledge_entries").select("*").order("created_at", { ascending: false }).limit(100);
    if (typeFilter !== "all") query.eq("entry_type", typeFilter);
    if (verifiedOnly === "verified") query.eq("admin_verified", true);
    if (verifiedOnly === "unverified") query.eq("admin_verified", false);
    // Server-side ilike search across title OR summary. Trigram indexes on
    // both columns keep this fast at scale (see append-only migration).
    const term = searchTerm.trim();
    if (term) {
      const escaped = term.replace(/[%_]/g, "\\$&");
      query.or(`entry_title.ilike.%${escaped}%,entry_summary.ilike.%${escaped}%`);
    }
    const { data } = await query;
    setEntries((data ?? []) as KnowledgeEntry[]);
  }, [supabase, typeFilter, verifiedOnly, searchTerm]);

  useEffect(() => { load(); }, [load]);

  const verify = async (id: string) => {
    await fetch("/api/admin/jeffery/verify-knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: id }),
    });
    await load();
  };

  const totalVerified = entries.filter(e => e.admin_verified).length;
  const verifiedPct = entries.length > 0 ? Math.round((totalVerified / entries.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Knowledge Explorer</h3>
        <span className="text-xs text-white/30 ml-auto">
          {entries.length} entries · {verifiedPct}% verified
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
        >
          {ENTRY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select
          value={verifiedOnly}
          onChange={e => setVerifiedOnly(e.target.value as typeof verifiedOnly)}
          className="bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="all">All</option>
          <option value="verified">Verified only</option>
          <option value="unverified">Unverified only</option>
        </select>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search title or summary..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none"
          />
        </div>
      </div>

      {/* Cards grid */}
      {entries.length === 0 ? (
        <div className="text-center text-white/30 text-sm py-12">
          No knowledge entries match your filters. Jeffery&rsquo;s ingest agents will populate this as research flows in.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entries.map(e => (
            <div key={e.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 flex flex-col">
              <div className="flex items-start gap-2 mb-2">
                {e.admin_verified
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  : <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white line-clamp-2">{e.entry_title}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{e.entry_type.replace(/_/g, " ")}</p>
                </div>
              </div>
              {e.entry_summary && (
                <p className="text-xs text-white/50 line-clamp-3 mb-2">{e.entry_summary}</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.05]">
                <span className="text-[10px] text-white/30">
                  {e.source_name ?? "n/a"} · conf {e.confidence?.toFixed(2) ?? "n/a"}
                </span>
                {!e.admin_verified && (
                  <button
                    onClick={() => verify(e.id)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

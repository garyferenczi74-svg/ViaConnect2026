"use client";

import { useState, useEffect, useCallback } from "react";
import { Compass, Send, Loader2, CheckCircle2, Clock, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SCOPES = [
  { value: "global", label: "All Systems" },
  { value: "consumer_advisor", label: "Consumer Advisor" },
  { value: "practitioner_advisor", label: "Practitioner Advisor" },
  { value: "naturopath_advisor", label: "Naturopath Advisor" },
  { value: "pubmed_agent", label: "PubMed Ingest Agent" },
  { value: "brand_agent", label: "Brand Enricher Agent" },
  { value: "search_agent", label: "Search Agent" },
  { value: "interaction_engine", label: "Interaction Engine" },
  { value: "protocol_engine", label: "Protocol Engine" },
  { value: "cache_builder", label: "Cache Builder" },
];

interface Directive {
  id: string;
  title: string;
  instruction: string;
  priority: string;
  scope: string;
  status: string;
  jeffery_acknowledgment: string | null;
  jeffery_progress: { steps_total?: number; steps_completed?: number; current_step?: string } | null;
  created_at: string;
}

export default function SteeringConsole() {
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [draft, setDraft] = useState({ title: "", instruction: "", priority: "normal", scope: "global" });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("jeffery_directives")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setDirectives((data ?? []) as Directive[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!draft.title.trim() || !draft.instruction.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: inserted } = await supabase
        .from("jeffery_directives")
        .insert({ author_id: user.id, ...draft })
        .select()
        .single();
      if (inserted) {
        await fetch("/api/admin/jeffery/process-directive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directiveId: inserted.id }),
        });
        setDraft({ title: "", instruction: "", priority: "normal", scope: "global" });
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColor = (p: string) =>
    p === "urgent" ? "bg-red-500/15 text-red-400"
    : p === "high" ? "bg-orange-500/15 text-orange-400"
    : p === "normal" ? "bg-blue-500/15 text-blue-400"
    : "bg-white/10 text-white/50";

  return (
    <div className="space-y-6">
      {/* New directive form */}
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Send Directive to Jeffery</h3>
        </div>
        <input
          type="text"
          value={draft.title}
          onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
          placeholder="Directive title (e.g., 'Prioritize MTHFR research')"
          className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors mb-3"
        />
        <textarea
          value={draft.instruction}
          onChange={e => setDraft(p => ({ ...p, instruction: e.target.value }))}
          placeholder="Detailed instruction for Jeffery (e.g., 'Focus PubMed ingestion on MTHFR C677T methylation studies published in the last 2 years. Prioritize RCTs and meta-analyses.')"
          rows={4}
          className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none resize-none focus:border-white/20 transition-colors mb-3"
        />
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40">Priority:</label>
            <select
              value={draft.priority}
              onChange={e => setDraft(p => ({ ...p, priority: e.target.value }))}
              className="bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40">Scope:</label>
            <select
              value={draft.scope}
              onChange={e => setDraft(p => ({ ...p, scope: e.target.value }))}
              className="bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
            >
              {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button
            onClick={submit}
            disabled={submitting || !draft.title.trim() || !draft.instruction.trim()}
            className="md:ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B75E18]/20 text-[#B75E18] text-sm font-medium hover:bg-[#B75E18]/30 disabled:opacity-30 transition-all"
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              : <Send className="w-4 h-4" strokeWidth={1.5} />}
            Send to Jeffery
          </button>
        </div>
      </div>

      {/* Active directives */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/60">Active &amp; Recent Directives</h3>
        {directives.length === 0 && (
          <div className="text-center text-white/30 text-sm py-8">No directives yet. Send your first one above.</div>
        )}
        {directives.map(d => {
          const progress = d.jeffery_progress;
          const pct = progress && progress.steps_total
            ? Math.round((progress.steps_completed ?? 0) / progress.steps_total * 100)
            : 0;
          return (
            <div key={d.id} className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{d.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityColor(d.priority)}`}>
                      {d.priority}
                    </span>
                    <span className="text-[10px] text-white/30">{SCOPES.find(s => s.value === d.scope)?.label}</span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">{d.instruction}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {d.status === "active" && <Clock className="w-4 h-4 text-blue-400" strokeWidth={1.5} />}
                  {d.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-400" strokeWidth={1.5} />}
                  {d.status === "paused" && <Pause className="w-4 h-4 text-amber-400" strokeWidth={1.5} />}
                </div>
              </div>
              {d.jeffery_acknowledgment && (
                <div className="mt-3 bg-[#0F172A] rounded-lg p-3 border-l-2 border-[#B75E18]">
                  <p className="text-[10px] text-[#B75E18] font-bold uppercase mb-1">Jeffery&rsquo;s Response</p>
                  <p className="text-xs text-white/60 whitespace-pre-wrap">{d.jeffery_acknowledgment}</p>
                  {progress && progress.steps_total && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                        <span>{progress.current_step}</span>
                        <span>{progress.steps_completed ?? 0}/{progress.steps_total}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-[#B75E18] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

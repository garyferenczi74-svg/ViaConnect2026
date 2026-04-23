"use client";

// Prompt #113 — Ask Kelsey chat surface. Paste text, get verdict.

import { useState } from "react";
import { BookMarked, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

type Verdict = "APPROVED" | "CONDITIONAL" | "BLOCKED" | "ESCALATE";
interface Result {
  verdict: Verdict;
  rationale: string;
  rule_references: string[];
  suggested_rewrite?: string;
  confidence: number;
  cached: boolean;
}

const ICON: Record<Verdict, typeof CheckCircle2> = {
  APPROVED: CheckCircle2,
  CONDITIONAL: AlertTriangle,
  BLOCKED: XCircle,
  ESCALATE: HelpCircle,
};
const COLOR: Record<Verdict, string> = {
  APPROVED: "text-emerald-300 border-emerald-700",
  CONDITIONAL: "text-amber-300 border-amber-700",
  BLOCKED: "text-rose-300 border-rose-700",
  ESCALATE: "text-sky-300 border-sky-700",
};

export default function Page() {
  const [text, setText] = useState("");
  const [jurisdiction, setJurisdiction] = useState<"US" | "CA">("US");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/compliance/kelsey/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, jurisdiction, subject_type: "claim" }),
      });
      const j = await r.json();
      if (!j.ok) { setError(j.error ?? "Review failed"); return; }
      setResult({
        verdict: j.verdict, rationale: j.rationale,
        rule_references: j.rule_references ?? [],
        suggested_rewrite: j.suggested_rewrite,
        confidence: j.confidence ?? 0,
        cached: !!j.cached,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const Icon = result ? ICON[result.verdict] : BookMarked;
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <BookMarked className="h-6 w-6 text-slate-300" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">Ask Kelsey</h2>
          <p className="text-sm text-slate-400">Paste any proposed text. Kelsey returns one of four verdicts.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-[#1E3054] p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste claim, protocol paragraph, social post, or marketing copy."
          rows={6}
          className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 focus:border-[#2DA5A0] focus:outline-none sm:text-sm"
        />
        <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            Jurisdiction
            <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value as "US" | "CA")} className="min-h-[44px] rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-base text-slate-100 sm:text-sm">
              <option value="US">US</option>
              <option value="CA">CA</option>
            </select>
          </label>
          <button
            onClick={submit}
            disabled={loading || !text.trim()}
            className="min-h-[44px] rounded-md bg-[#2DA5A0] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-[#3BBDB7]"
          >
            {loading ? "Reviewing ..." : "Submit for review"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border-l-4 border-rose-500 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>
      )}

      {result && (
        <div className={`rounded-2xl border-2 bg-[#1E3054] p-4 ${COLOR[result.verdict]}`}>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            <span className="text-lg font-semibold">{result.verdict}</span>
            {result.cached && <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">cached</span>}
            <span className="ml-auto text-xs text-slate-400">confidence {(result.confidence * 100).toFixed(0)}%</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{result.rationale}</p>
          {result.suggested_rewrite && (
            <div className="mt-3 rounded-md bg-slate-950 p-3 text-sm">
              <div className="mb-1 text-xs uppercase tracking-wider text-slate-500">Suggested rewrite</div>
              <div className="text-slate-100">{result.suggested_rewrite}</div>
            </div>
          )}
          {result.rule_references.length > 0 && (
            <div className="mt-3 text-xs text-slate-400">
              <span className="uppercase tracking-wider">Rule references: </span>
              {result.rule_references.join("; ")}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SessionStatusPill from "@/components/precheck/SessionStatusPill";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data: session } = await supabase.from("precheck_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();
  const { data: findings } = await supabase.from("precheck_findings").select("*").eq("session_id", id).order("round", { ascending: true });
  const s = session as Record<string, unknown>;
  const fs = (findings ?? []) as Array<{ id: string; rule_id: string; severity: string; confidence: number; remediation_kind: string; round: number }>;

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/practitioner/marshall/precheck/sessions" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white font-mono">{s.session_id as string}</h1>
        <SessionStatusPill status={s.status as string} />
      </div>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 space-y-2">
        <div className="text-xs text-white/60"><b className="text-white">Source:</b> {s.source as string}</div>
        <div className="text-xs text-white/60"><b className="text-white">Draft hash:</b> <span className="font-mono break-all">{s.draft_hash_sha256 as string}</span></div>
        <div className="text-xs text-white/60"><b className="text-white">Normalization:</b> {s.normalization_version as string} / rule registry {s.rule_registry_version as string}</div>
        <div className="text-xs text-white/60"><b className="text-white">Created:</b> {new Date(s.created_at as string).toLocaleString()}</div>
        {s.cleared_at ? <div className="text-xs text-emerald-300"><b className="text-white">Cleared at:</b> {new Date(s.cleared_at as string).toLocaleString()}</div> : null}
      </div>

      <div className="mt-4 bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <h3 className="text-xs font-semibold text-white mb-2">Findings (rule-level; content redacted)</h3>
        {fs.length === 0 && <p className="text-xs text-white/40">No findings recorded.</p>}
        <ul className="space-y-1">
          {fs.map((f) => (
            <li key={f.id} className="text-xs text-white/70 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{f.severity}</span>
              <span className="font-mono text-white/80">{f.rule_id}</span>
              <span className="text-white/40">conf {Number(f.confidence).toFixed(2)}</span>
              <span className="text-white/40">round {f.round}</span>
              <span className="text-white/40 ml-auto">{f.remediation_kind}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

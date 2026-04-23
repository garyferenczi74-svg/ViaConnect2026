import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Radar, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SignalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data: signal } = await supabase.from("social_signals").select("*").eq("id", id).maybeSingle();
  if (!signal) notFound();
  const { data: evidence } = await supabase
    .from("compliance_evidence")
    .select("id, manifest_sha256, collected_at, wayback_url, legal_hold, artifacts:compliance_evidence_artifacts(id, kind, sha256, storage_key, size_bytes)")
    .eq("signal_id", id)
    .maybeSingle();
  const s = signal as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/admin/marshall/hounddog/signals" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>

      <div className="flex items-center gap-2 mb-4">
        <Radar className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white break-all">{s.author_handle as string}</h1>
        <span className="text-xs text-white/40 ml-2">{s.collector_id as string}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Source URL">
          <a href={s.url as string} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B75E18] break-all hover:underline">{s.url as string}</a>
        </Card>
        <Card title="Status + confidence">
          <div className="text-xs text-white/70">{s.status as string}</div>
          <div className="text-xs text-white/70">overall {Number(s.overall_confidence ?? 0).toFixed(2)}</div>
          <div className="text-xs text-white/70">quality {Number(s.content_quality_score ?? 0).toFixed(2)}</div>
        </Card>
        {s.matched_practitioner_id ? (
          <Card title="Practitioner attribution">
            <div className="text-xs text-white/70 font-mono">{s.matched_practitioner_id as string}</div>
            <div className="text-xs text-white/70">match {Number(s.practitioner_match_confidence ?? 0).toFixed(2)} via {s.practitioner_match_method as string}</div>
          </Card>
        ) : (
          <Card title="Practitioner attribution">
            <div className="text-xs text-white/40">No matched practitioner (non-attributable).</div>
          </Card>
        )}
        <Card title="Product matches">
          <pre className="text-[11px] text-white/60 bg-[#0F172A] rounded p-2 overflow-x-auto">{JSON.stringify(s.product_matches, null, 2)}</pre>
        </Card>
      </div>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 mt-4">
        <h3 className="text-xs font-medium text-white/60 mb-2">Derived text</h3>
        <p className="text-xs text-white/70 whitespace-pre-wrap">{(s.text_derived as string) ?? "[empty]"}</p>
      </div>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold text-white">Evidence bundle</h3>
        </div>
        {!evidence && <p className="text-xs text-white/40">No bundle linked yet.</p>}
        {evidence && (
          <div className="space-y-2">
            <div className="text-[11px] text-white/60">bundle manifest: <span className="font-mono">{(evidence as { manifest_sha256: string }).manifest_sha256}</span></div>
            {((evidence as { wayback_url?: string }).wayback_url) && (
              <a href={(evidence as { wayback_url: string }).wayback_url} className="text-[11px] text-[#B75E18] hover:underline">Wayback snapshot</a>
            )}
            <div className="text-[11px] text-white/60">artifacts:</div>
            <pre className="text-[11px] text-white/60 bg-[#0F172A] rounded p-2 overflow-x-auto">{JSON.stringify((evidence as { artifacts?: unknown[] }).artifacts ?? [], null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

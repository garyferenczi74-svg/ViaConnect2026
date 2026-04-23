import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RuleDetailPage({ params }: { params: Promise<{ ruleId: string }> }) {
  const { ruleId } = await params;
  const decoded = decodeURIComponent(ruleId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase.from("compliance_rules").select("*").eq("id", decoded).maybeSingle();
  if (!data) notFound();
  const r = data as { id: string; pillar: string; severity: string; surfaces: string[]; citation: string; description: string; enabled: boolean; threshold_config: Record<string, unknown> | null; last_reviewed: string };
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/admin/marshall/rules" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white font-mono">{r.id}</h1>
      </div>
      <div className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-4 space-y-2">
        <div className="text-xs text-white/60"><b className="text-white">Pillar:</b> {r.pillar}</div>
        <div className="text-xs text-white/60"><b className="text-white">Severity:</b> {r.severity}</div>
        <div className="text-xs text-white/60"><b className="text-white">Surfaces:</b> {r.surfaces.join(", ")}</div>
        <div className="text-xs text-white/60"><b className="text-white">Citation:</b> {r.citation}</div>
        <div className="text-xs text-white/60"><b className="text-white">Last reviewed:</b> {r.last_reviewed}</div>
        <div className="text-xs text-white/60"><b className="text-white">Enabled:</b> {r.enabled ? "yes" : "no"}</div>
      </div>
      <div className="mt-4 bg-[#1E3054] rounded-lg border border-white/[0.08] p-4">
        <h3 className="text-xs font-medium text-white/60 mb-2">Description</h3>
        <p className="text-xs text-white/70">{r.description}</p>
      </div>
      {r.threshold_config && (
        <div className="mt-4 bg-[#1E3054] rounded-lg border border-white/[0.08] p-4">
          <h3 className="text-xs font-medium text-white/60 mb-2">Threshold config</h3>
          <pre className="text-xs text-white/70 bg-[#0F172A] rounded-lg p-3 overflow-x-auto">{JSON.stringify(r.threshold_config, null, 2)}</pre>
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <form action="/api/marshall/rules/toggle" method="POST">
          <input type="hidden" name="ruleId" value={r.id} />
          <input type="hidden" name="enabled" value={r.enabled ? "false" : "true"} />
          <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs hover:bg-white/10">
            {r.enabled ? "Disable rule" : "Enable rule"}
          </button>
        </form>
        <form action="/api/marshall/rules/review" method="POST">
          <input type="hidden" name="ruleId" value={r.id} />
          <button className="px-3 py-1.5 rounded-lg bg-[#B75E18]/15 text-[#B75E18] text-xs hover:bg-[#B75E18]/25">
            Mark reviewed today
          </button>
        </form>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage({ params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase.from("compliance_incidents").select("*").eq("incident_id", incidentId).maybeSingle();
  if (!data) notFound();
  const i = data as { incident_id: string; title: string; severity: string; opened_by: string; opened_at: string; closed_at: string | null; root_cause: string | null; dev_side_escape: boolean; narrative: string | null; related_finding_ids: string[] };
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/admin/marshall/incidents" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <FileWarning className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">{i.title}</h1>
      </div>
      <div className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-4 space-y-2">
        <div className="text-xs text-white/60"><b className="text-white">Incident:</b> {i.incident_id}</div>
        <div className="text-xs text-white/60"><b className="text-white">Severity:</b> {i.severity}</div>
        <div className="text-xs text-white/60"><b className="text-white">Opened by:</b> {i.opened_by}</div>
        <div className="text-xs text-white/60"><b className="text-white">Opened:</b> {new Date(i.opened_at).toLocaleString()}</div>
        {i.closed_at && <div className="text-xs text-white/60"><b className="text-white">Closed:</b> {new Date(i.closed_at).toLocaleString()}</div>}
        {i.dev_side_escape && <div className="text-xs text-red-400">Dev-side escape: runtime caught what Claude Code Marshall should have.</div>}
      </div>
      {i.root_cause && (
        <div className="mt-4 bg-[#1E3054] rounded-lg border border-white/[0.08] p-4">
          <h3 className="text-xs font-medium text-white/60 mb-2">Root cause</h3>
          <p className="text-xs text-white/70 whitespace-pre-wrap">{i.root_cause}</p>
        </div>
      )}
      {i.narrative && (
        <div className="mt-4 bg-[#1E3054] rounded-lg border border-white/[0.08] p-4">
          <h3 className="text-xs font-medium text-white/60 mb-2">Narrative</h3>
          <p className="text-xs text-white/70 whitespace-pre-wrap">{i.narrative}</p>
        </div>
      )}
      {i.related_finding_ids?.length > 0 && (
        <div className="mt-4 bg-[#1E3054] rounded-lg border border-white/[0.08] p-4">
          <h3 className="text-xs font-medium text-white/60 mb-2">Related findings</h3>
          <ul className="list-disc list-inside text-xs text-white/70 space-y-1">
            {i.related_finding_ids.map(id => <li key={id} className="font-mono">{id}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

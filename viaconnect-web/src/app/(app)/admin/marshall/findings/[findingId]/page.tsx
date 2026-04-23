import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MarshallNotice from "@/components/compliance/MarshallNotice";

export const dynamic = "force-dynamic";

interface FindingRow {
  id: string;
  finding_id: string;
  rule_id: string;
  severity: "P0" | "P1" | "P2" | "P3" | "ADVISORY";
  surface: string;
  source: string;
  location: Record<string, unknown>;
  excerpt: string;
  message: string;
  citation: string;
  remediation: { kind: string; summary: string; action?: string };
  status: string;
  escalated_to: string[] | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default async function FindingDetailPage({ params }: { params: Promise<{ findingId: string }> }) {
  const { findingId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("compliance_findings")
    .select("*")
    .eq("finding_id", findingId)
    .maybeSingle();
  if (!data) notFound();
  const f = data as unknown as FindingRow;

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/admin/marshall/findings" className="text-white/50 hover:text-white flex items-center gap-1 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
        </Link>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Finding {f.finding_id}</h1>
      </div>

      <MarshallNotice
        title={f.rule_id}
        severity={f.severity}
        message={f.message}
        citation={f.citation}
        remediation={f.remediation.summary}
      />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Meta label="Surface" value={f.surface} />
        <Meta label="Source" value={f.source === "claude_code" ? "Claude Code" : "Runtime"} />
        <Meta label="Status" value={f.status} />
        <Meta label="Created" value={new Date(f.created_at).toLocaleString()} />
        {f.resolved_at && <Meta label="Resolved" value={new Date(f.resolved_at).toLocaleString()} />}
        {f.escalated_to && f.escalated_to.length > 0 && (
          <Meta label="Escalated to" value={f.escalated_to.join(", ")} />
        )}
      </div>

      <div className="mt-4 bg-[#1E3054] rounded-lg border border-white/[0.08] p-4">
        <h3 className="text-xs font-medium text-white/60 mb-2">Excerpt</h3>
        <pre className="text-xs text-white/70 bg-[#0F172A] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{f.excerpt}</pre>
      </div>

      <div className="mt-4 bg-[#1E3054] rounded-lg border border-white/[0.08] p-4">
        <h3 className="text-xs font-medium text-white/60 mb-2">Location</h3>
        <pre className="text-xs text-white/70 bg-[#0F172A] rounded-lg p-3 overflow-x-auto">{JSON.stringify(f.location, null, 2)}</pre>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <FindingAction findingId={f.finding_id} action="acknowledge" label="Acknowledge" />
        <FindingAction findingId={f.finding_id} action="remediate" label="Mark remediated" />
        <FindingAction findingId={f.finding_id} action="waive" label="Request waiver" />
        <FindingAction findingId={f.finding_id} action="escalate" label="Escalate" />
        <FindingAction findingId={f.finding_id} action="close" label="Close" />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
      <div className="text-[10px] text-white/40 uppercase tracking-wide">{label}</div>
      <div className="text-xs text-white mt-1 break-all">{value}</div>
    </div>
  );
}

function FindingAction({ findingId, action, label }: { findingId: string; action: string; label: string }) {
  return (
    <form action={`/api/marshall/findings/${action}`} method="POST">
      <input type="hidden" name="findingId" value={findingId} />
      <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs hover:bg-white/10">{label}</button>
    </form>
  );
}

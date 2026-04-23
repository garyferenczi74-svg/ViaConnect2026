import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gavel, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("practitioner_notices")
    .select("*, finding:compliance_findings(rule_id, severity, message, citation, excerpt, remediation)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const n = data as Record<string, unknown>;
  const finding = n.finding as { rule_id: string; severity: string; message: string; citation: string; excerpt: string; remediation: { summary: string } } | null;
  const { data: appeals } = await supabase
    .from("practitioner_notice_appeals")
    .select("id, rebuttal, claim_type, submitted_at, resolution, resolved_at")
    .eq("notice_id", id)
    .order("submitted_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/practitioner/compliance/notices" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Notice {n.notice_id as string}</h1>
      </div>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 space-y-2">
        <div className="text-xs text-white/60"><b className="text-white">Severity:</b> {n.severity as string}</div>
        <div className="text-xs text-white/60"><b className="text-white">Status:</b> {n.status as string}</div>
        <div className="text-xs text-white/60"><b className="text-white">Remediation due:</b> {new Date(n.remediation_due_at as string).toLocaleString()}</div>
        {finding && (
          <>
            <div className="text-xs text-white/60"><b className="text-white">Rule:</b> <span className="font-mono">{finding.rule_id}</span></div>
            <div className="text-xs text-white/60"><b className="text-white">Citation:</b> {finding.citation}</div>
          </>
        )}
      </div>

      {finding && (
        <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
            <h3 className="text-xs font-semibold text-white">Finding</h3>
          </div>
          <p className="text-xs text-white/70">{finding.message}</p>
          <p className="text-xs text-white/50 mt-2 whitespace-pre-wrap bg-[#0F172A] rounded p-2">{finding.excerpt}</p>
          <p className="text-xs text-white/60 mt-2"><b className="text-white">Remediation:</b> {finding.remediation.summary}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <form action={`/api/practitioner/compliance/notices/${id}/acknowledge`} method="POST">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/70 hover:bg-white/10">Acknowledge</button>
        </form>
        <form action={`/api/practitioner/compliance/notices/${id}/remediate`} method="POST">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">Mark remediated</button>
        </form>
        <Link href={`/practitioner/compliance/notices/${id}/appeal`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B75E18]/15 text-[#B75E18] hover:bg-[#B75E18]/25">Submit appeal</Link>
      </div>

      {appeals && (appeals as unknown[]).length > 0 && (
        <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 mt-4">
          <h3 className="text-xs font-semibold text-white mb-2">Appeal history</h3>
          <div className="space-y-2">
            {((appeals as unknown) as Array<{ id: string; rebuttal: string; claim_type: string; submitted_at: string; resolution: string | null; resolved_at: string | null }>).map((a) => (
              <div key={a.id} className="bg-[#0F172A] rounded p-2">
                <div className="text-[10px] text-white/40 flex items-center gap-2">
                  <span>{a.claim_type}</span>
                  <span>{new Date(a.submitted_at).toLocaleString()}</span>
                  {a.resolution && <span className="ml-auto px-1.5 py-0.5 rounded bg-white/10 text-white/70">{a.resolution}</span>}
                </div>
                <p className="text-xs text-white/70 mt-1">{a.rebuttal}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

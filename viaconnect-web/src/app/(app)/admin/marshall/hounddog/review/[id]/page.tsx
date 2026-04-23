import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase.from("social_review_queue").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as Record<string, unknown>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/admin/marshall/hounddog/review" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white font-mono">Review {id.slice(0, 8)}</h1>
      </div>
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 space-y-2">
        <div className="text-xs text-white/60"><b className="text-white">Signal:</b> <Link href={`/admin/marshall/hounddog/signals/${r.signal_id as string}`} className="text-[#B75E18] hover:underline font-mono">{r.signal_id as string}</Link></div>
        <div className="text-xs text-white/60"><b className="text-white">Reason:</b> {r.reason as string}</div>
        <div className="text-xs text-white/60"><b className="text-white">Confidence:</b> {Number(r.confidence).toFixed(2)}</div>
        <div className="text-xs text-white/60"><b className="text-white">Suggested rules:</b> {(r.suggested_rule_ids as string[]).join(", ") || "(none)"}</div>
        <div className="text-xs text-white/60"><b className="text-white">Status:</b> {r.status as string}</div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <form action={`/api/marshall/hounddog/review/${id}/confirm`} method="POST">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">Confirm + open finding</button>
        </form>
        <form action={`/api/marshall/hounddog/review/${id}/dismiss`} method="POST">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/70 hover:bg-white/10">Dismiss</button>
        </form>
        <form action={`/api/marshall/hounddog/review/${id}/escalate`} method="POST">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25">Escalate to legal</button>
        </form>
      </div>
    </div>
  );
}

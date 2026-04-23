import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertOctagon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TakedownDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase.from("takedown_requests").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const t = data as Record<string, unknown>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/admin/marshall/hounddog/takedowns" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <AlertOctagon className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Takedown draft</h1>
      </div>
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 space-y-2">
        <div className="text-xs text-white/60"><b className="text-white">Platform:</b> {t.platform as string}</div>
        <div className="text-xs text-white/60"><b className="text-white">Mechanism:</b> {t.mechanism as string}</div>
        <div className="text-xs text-white/60 break-all"><b className="text-white">Listing:</b> {t.listing_url as string}</div>
        <div className="text-xs text-white/60"><b className="text-white">Status:</b> {t.status as string}</div>
      </div>
      <div className="mt-4 bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <h3 className="text-xs font-medium text-white/60 mb-2">Draft body (Steve approves before any platform is contacted)</h3>
        <pre className="text-xs text-white/80 bg-[#0F172A] rounded p-3 overflow-x-auto whitespace-pre-wrap">{(t.draft_body as string) ?? "[no draft]"}</pre>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <form action={`/api/marshall/hounddog/takedowns/${id}/mark-submitted`} method="POST">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">Mark submitted</button>
        </form>
        <form action={`/api/marshall/hounddog/takedowns/${id}/withdraw`} method="POST">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/70 hover:bg-white/10">Withdraw</button>
        </form>
      </div>
    </div>
  );
}

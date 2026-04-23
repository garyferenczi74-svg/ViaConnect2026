import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ReceiptCard from "@/components/precheck/ReceiptCard";

export const dynamic = "force-dynamic";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("precheck_clearance_receipts")
    .select("*")
    .eq("receipt_id", id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as Record<string, unknown>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href="/practitioner/marshall/precheck/receipts" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <ReceiptCard
        receiptId={r.receipt_id as string}
        issuedAt={r.issued_at as string}
        expiresAt={r.expires_at as string}
        draftHashSha256={r.draft_hash_sha256 as string}
        signingKeyId={r.signing_key_id as string}
      />
      <div className="mt-4 bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <h3 className="text-xs font-semibold text-white mb-2">Compact JWT</h3>
        <pre className="text-[11px] text-white/70 bg-[#0F172A] rounded p-3 overflow-x-auto break-all whitespace-pre-wrap">{r.jwt_compact as string}</pre>
        <p className="text-[10px] text-white/40 mt-2">Verifiable against /.well-known/marshall-clearance-jwks.json using the ES256 public key.</p>
      </div>
    </div>
  );
}

import { FileCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

export interface ReceiptCardProps {
  receiptId: string;
  issuedAt: string;
  expiresAt: string;
  draftHashSha256: string;
  signingKeyId: string;
}

export default function ReceiptCard(p: ReceiptCardProps) {
  const expired = new Date(p.expiresAt).getTime() < Date.now();
  return (
    <div className="bg-[#1E3054] rounded-xl border border-emerald-500/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <FileCheck className="w-4 h-4 text-emerald-300" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Clearance receipt
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" strokeWidth={1.5} />
          </h3>
          <p className="text-[11px] text-white/40 font-mono">{p.receiptId}</p>
        </div>
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-white/60">
        <div><dt className="text-white/40">Issued</dt><dd>{new Date(p.issuedAt).toLocaleString()}</dd></div>
        <div><dt className="text-white/40">Expires</dt><dd className={expired ? "text-red-400" : ""}>{new Date(p.expiresAt).toLocaleString()}</dd></div>
        <div className="md:col-span-2"><dt className="text-white/40">Draft hash</dt><dd className="font-mono break-all">{p.draftHashSha256}</dd></div>
        <div><dt className="text-white/40">Signing key</dt><dd className="font-mono">{p.signingKeyId}</dd></div>
      </dl>
      <Link href={`/practitioner/marshall/precheck/receipts/${p.receiptId}`} className="text-[11px] text-[#B75E18] hover:underline mt-3 inline-block">
        View detail
      </Link>
    </div>
  );
}

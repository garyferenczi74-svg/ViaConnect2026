import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-static";

export default async function ComplianceHoldPage({ searchParams }: { searchParams: Promise<{ findingId?: string }> }) {
  const { findingId } = await searchParams;
  return (
    <div className="min-h-screen bg-[#1A2744] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1E3054] rounded-xl border border-white/[0.08] p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6 text-[#B75E18]" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-white">Compliance hold</h1>
        <p className="text-sm text-white/60 mt-2">
          Marshall paused this request because something about the URL triggered a compliance rule. If you believe
          this is an error, contact our team.
        </p>
        {findingId && <p className="text-[10px] text-white/30 mt-3 font-mono">Finding: {findingId}</p>}
        <Link href="/" className="text-xs text-[#B75E18] mt-4 inline-block hover:underline">Return home</Link>
      </div>
    </div>
  );
}

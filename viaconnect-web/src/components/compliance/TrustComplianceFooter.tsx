import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function TrustComplianceFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0F172A]/60 px-4 py-3 md:px-8">
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-white/40">
        <ShieldCheck className="w-3.5 h-3.5 text-[#B75E18]" strokeWidth={1.5} />
        <span>Marshall, Compliance Officer, ViaConnect. Cite. Remediate. Document.</span>
        <span className="mx-1 text-white/20">|</span>
        <Link href="/trust-compliance" className="hover:text-white/70 transition-colors">
          Trust &amp; Compliance
        </Link>
        <span className="mx-1 text-white/20">|</span>
        <Link href="/dsar" className="hover:text-white/70 transition-colors">
          Privacy request
        </Link>
        <span className="mx-1 text-white/20">|</span>
        <Link href="/trust-compliance/incidents" className="hover:text-white/70 transition-colors">
          Incident history
        </Link>
      </div>
    </footer>
  );
}

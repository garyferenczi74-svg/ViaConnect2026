import Link from "next/link";
import { ShieldCheck, Scale, Gavel, FileText } from "lucide-react";

export const dynamic = "force-static";

export default function TrustCompliancePage() {
  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#B75E18]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Trust and Compliance</h1>
            <p className="text-sm text-white/50">How ViaConnect protects what you share with us.</p>
          </div>
        </div>

        <section className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 mb-4">
          <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} /> Our regulatory posture
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            ViaConnect is operated by FarmCeutica Wellness LLC. Our supplements comply with DSHEA and 21 CFR 111 GMP
            standards. Peptide protocols follow state-specific scope-of-practice rules, and practitioners on our
            platform are verified against the CMS NPPES registry and the OIG LEIE sanctions list on a weekly cadence.
            Our genetic panels are run by HIPAA-compliant lab partners with active BAAs.
          </p>
        </section>

        <section className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 mb-4">
          <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <Gavel className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} /> Meet Marshall
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Marshall is our runtime Compliance Officer. Every AI recommendation, every product page, every cart,
            every outbound message, every genetic report, and every practitioner action is evaluated before it
            reaches a user. Marshall pairs with a development-side sibling that enforces the same rules at commit
            time. Findings are logged to an immutable, hash-chained ledger; our team reviews them on a cadence set by
            severity. Cite. Remediate. Document.
          </p>
        </section>

        <section className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 mb-4">
          <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} /> Your privacy rights
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            You can request a copy of your data, correct it, port it to another service, or delete it at any time.
            We honor CCPA, CPRA, GDPR, Quebec Law 25, and state privacy laws in Colorado, Connecticut, Virginia,
            Utah, Iowa, and Texas. Deletion requests cascade across every system that touches your data.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Link href="/dsar" className="px-4 py-2 rounded-lg bg-[#B75E18]/20 text-[#B75E18] text-sm font-medium hover:bg-[#B75E18]/30 transition-colors">
              Submit a privacy request
            </Link>
            <Link href="/trust-compliance/incidents" className="px-4 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors">
              View incident history
            </Link>
          </div>
        </section>

        <p className="text-[11px] text-white/30 mt-6">
          Marshall, Compliance Officer, ViaConnect. Cite. Remediate. Document.
        </p>
      </div>
    </div>
  );
}

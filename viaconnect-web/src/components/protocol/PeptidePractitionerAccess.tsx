"use client";

import { ShieldCheck, Stethoscope, Leaf } from "lucide-react";

export function PeptidePractitionerAccess() {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#2DA5A033" }} />
          <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)", border: "1px solid #2DA5A026" }}>
            <ShieldCheck className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white mb-2">
            Get Prescribed \, Connect with a Provider
          </h3>
          <p className="text-sm text-white/40 leading-relaxed mb-4">
            All FarmCeutica\u2122 peptides are oral, high-bioavailability formulations
            designed for wellness support. For best results, your peptide protocol
            should be reviewed and prescribed by a licensed practitioner or naturopath
            who can access your full Ultrathink profile.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href="/supplements#practitioner" className="min-h-[48px] flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-semibold hover:bg-teal-400/20 transition-all">
              <Stethoscope className="w-4 h-4" strokeWidth={1.5} />
              Find a Practitioner
            </a>
            <a href="/supplements#practitioner" className="min-h-[48px] flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/20 transition-all">
              <Leaf className="w-4 h-4" strokeWidth={1.5} />
              Find a Naturopath
            </a>
          </div>

          <p className="text-[10px] text-white/15 mt-3">
            Your Ultrathink summary will be pre-filled for your provider to review.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Dna, ArrowRight } from "lucide-react";

export function ProtocolConfidenceCTA({
  currentConfidence = 72,
  targetConfidence = 96,
}: {
  currentConfidence?: number;
  targetConfidence?: number;
}) {
  return (
    <Link
      href="/genetics"
      className="block rounded-2xl p-5 md:p-6 relative overflow-hidden transition-transform hover:scale-[1.005]"
      style={{
        background: "rgba(30,48,84,0.45)",
        border: "1px solid rgba(232,128,58,0.35)",
        boxShadow:
          "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(232,128,58,0.22) 0%, transparent 70%)",
        }}
      />

      <div className="flex items-start gap-4 relative">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "rgba(232,128,58,0.14)",
            border: "1px solid rgba(232,128,58,0.35)",
          }}
        >
          <Dna className="w-5 h-5" strokeWidth={1.5} style={{ color: "#E8803A" }} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] uppercase tracking-[0.18em] mb-1"
            style={{ color: "#E8803A", fontFamily: "var(--font-dm-mono), monospace" }}
          >
            GENEX360 Upgrade
          </p>
          <p
            className="text-base md:text-lg font-semibold text-white mb-1"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            Lift Protocol Confidence: {currentConfidence}% to {targetConfidence}%
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            Add your genetic profile so Hannah can match compounds to your genotype. Bioavailability ranges 10 to 27 times with precision dosing.
          </p>
        </div>

        <div className="shrink-0 self-center">
          <ArrowRight className="w-5 h-5" strokeWidth={1.5} style={{ color: "#E8803A" }} />
        </div>
      </div>

      <div className="mt-4 relative">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${currentConfidence}%`,
              background: "linear-gradient(90deg, #E8803A66 0%, #E8803A 100%)",
              boxShadow: "0 0 12px rgba(232,128,58,0.4)",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-white/40 tabular-nums">{currentConfidence}%</span>
          <span className="text-[10px] text-white/40 tabular-nums">{targetConfidence}%</span>
        </div>
      </div>
    </Link>
  );
}

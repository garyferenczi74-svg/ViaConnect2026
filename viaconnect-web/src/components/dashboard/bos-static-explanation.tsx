'use client';

// BOSStaticExplanation: evergreen teaching paragraph for the Bio
// Optimization Score card. Distinct from BOSExplanation, which carries
// Hannah's per-compute, per-user voice. This block teaches WHAT the
// score is so the user can read the surrounding pills with context.
//
// Copy is Hannah-voice authored per #161e §6.3. The legacy
// BioOptimizationGauge (recovered in docs/findings/161e-legacy-bos-card-recovery.md)
// did not carry static teaching copy, so the paragraph is drafted
// fresh here. It contains zero em dashes, zero en dashes, zero emojis,
// no disease names, no therapeutic claims.

export function BOSStaticExplanation() {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        What this measures
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/75">
        Your Bio Optimization Score blends two signals: how accurate your diagnostic foundation
        is, and how consistently you engage the daily levers. As your foundation moves from CAQ
        to Labs to Genetics, the score grows more precise. As you log meals, supplements, body
        measurements, wearable data, plug ins, and challenges, the score moves with you.
      </p>
    </div>
  );
}

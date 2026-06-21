// Prompt 204 (2026-06-21): the SAMPLE badge. When a member buys the GeneX360
// bundle their six panels are populated immediately with SAMPLE (seeded demo)
// results so the experience works before a real lab feed exists. This badge marks
// every one of those readings so a member can NEVER mistake demo data for their
// own real DNA or epigenetic results. It is a compliance guardrail, so it is
// deliberately plain and unmistakable, and it is NEUTRAL (never an alarm or a
// reassuring color) because it is a provenance label, not a result.
//
// Standing rules honored: neutral tokens only (white opacity neutrals, no brand
// or severity token, no alarm color), Lucide strokeWidth 1.5 outline, no emojis,
// no em or en dashes, TypeScript strict (no any).

import { FlaskConical } from "lucide-react";

export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70 ${className ?? ""}`}
      title="Seeded sample data, not your own result"
    >
      <FlaskConical aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />
      Sample
    </span>
  );
}

export default SampleBadge;

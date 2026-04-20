// Prompt #99 Phase 1 (Path A): Mandatory medical disclaimer footer.
//
// Per §3.4 of the prompt, every analytics page renders this component
// at the bottom of the viewport. The canonical anchor text
// "decision-support tools, not medical advice" must be preserved
// verbatim — the Helix-isolation test greps for it.

import { ShieldAlert } from 'lucide-react';

export function MedicalDisclaimer() {
  return (
    <footer
      role="contentinfo"
      aria-label="Medical disclaimer"
      className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4"
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          className="h-4 w-4 text-amber-400 mt-0.5 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="text-[11px] leading-relaxed text-amber-200/80">
          Analytics insights are decision-support tools, not medical advice.
          Clinical decisions remain the responsibility of the licensed
          practitioner.
        </p>
      </div>
    </footer>
  );
}

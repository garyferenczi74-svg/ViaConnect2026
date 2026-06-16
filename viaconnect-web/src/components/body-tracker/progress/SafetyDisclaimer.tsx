'use client';

// Prompt 179 Section 7.6 Safety and Disclaimer. Prompt 201 (2026-06-15): moved
// into a muted ProgressCard (no luminous edge, low emphasis) so it reads as a
// footnote rather than an instrument. The disclaimer copy is preserved verbatim.

import { ShieldAlert } from 'lucide-react';
import { ProgressCard } from './ProgressCard';

export function SafetyDisclaimer() {
  return (
    <ProgressCard muted>
      <div className="mb-2 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-white/40" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-white/80">Safety and Disclaimer</h2>
      </div>
      <div className="space-y-2 text-xs leading-relaxed text-white/55">
        <p>
          Your daily calorie target never drops below a conventional floor of 1,500 kcal for men and
          1,200 kcal for women, and your rate of change is capped at the lesser of 2 lb per week or 1
          percent of your body weight. When a target date would require more than that, the engine
          keeps you at the safe value and moves the projected date instead; it never lowers your
          calories below the floor to hit a date.
        </p>
        <p>
          This is general wellness guidance, not medical advice. Please consult a clinician or a
          registered dietitian before you begin, especially if you take GLP-1 or other
          weight-affecting medications or have a medical condition. Peptides are educational only and
          are never surfaced as commercial goal inputs.
        </p>
      </div>
    </ProgressCard>
  );
}

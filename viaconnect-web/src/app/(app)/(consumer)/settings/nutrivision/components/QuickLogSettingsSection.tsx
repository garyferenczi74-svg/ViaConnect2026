/**
 * Prompt 170m Phase D: Quick Log settings section.
 *
 * Inline informational section that explains the Quick Log entry path on
 * the NutriVision tab. v1 ships read-only (no user-level toggles yet);
 * the kill switch QUICK_LOG_TEXT_ENABLED is server-side and controls
 * availability for the whole user base. Per-user preferences (auto-parse
 * on type pause, hide Quick Log card from idle state) are filed for a
 * future supplement when the surface has bake time.
 *
 * Sits between VoiceSettingsSection and the Barcode link per Hannah Gate 3
 * Option C consolidated Entry path preferences design.
 */

'use client';

import { MessageSquareText } from 'lucide-react';

export function QuickLogSettingsSection() {
  return (
    <section
      aria-labelledby="quick-log-settings-heading"
      className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#2DA5A0]/15">
          <MessageSquareText className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 id="quick-log-settings-heading" className="text-sm font-semibold text-white">
            Quick Log
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-white/65">
            Type what you ate on the NutriVision tab and we parse it into structured items.
            Works for simple meals, restaurant orders, branded products, and quick repeats.
            Up to 500 characters per entry. Your text is stored on saved meals only.
          </p>
        </div>
      </div>
    </section>
  );
}

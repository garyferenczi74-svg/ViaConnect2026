/**
 * Prompt 170n Phase D: Voice-Native settings section.
 *
 * Sits adjacent to VoiceSettingsSection (170j) and QuickLogSettingsSection
 * (170m) under the consolidated "Entry path preferences" structure per
 * Hannah Gate 3 Option C. Read-only informational in v1; per-user toggles
 * (transcript retention opt-in, hide Voice card from idle, push-to-talk
 * default) deferred to a Phase D follow-up endpoint once the surface has
 * bake time.
 *
 * The server-side VOICE_NATIVE_ENABLED kill switch is the master
 * availability gate. VOICE_NATIVE_TRANSCRIPT_RETENTION_ENABLED gates whether
 * the future opt-in toggle's effect persists (defaults false at v1; audio
 * is always ephemeral regardless).
 */

'use client';

import { Mic } from 'lucide-react';

export function VoiceNativeSettingsSection() {
  return (
    <section
      aria-labelledby="voice-native-settings-heading"
      className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#2DA5A0]/15">
          <Mic className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 id="voice-native-settings-heading" className="text-sm font-semibold text-white">
            Voice
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-white/65">
            Speak your meal aloud on the NutriVision tab and we parse it into structured items.
            Works for simple meals, restaurant orders, branded products, and hands-free logging while cooking or eating.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/55">
            Your voice is processed on your device when possible. Audio is never retained.
            Transcripts are not saved unless you opt in (coming soon).
          </p>
        </div>
      </div>
    </section>
  );
}

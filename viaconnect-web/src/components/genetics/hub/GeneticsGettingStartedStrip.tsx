'use client';

// Prompt 191 Task B (2026-06-12): My Genetics Getting Started strip.
//
// Mirrors the My Nutrition Getting Started strip
// (NutritionGettingStartedStrip.tsx), which models the My Biology
// GuidanceStrip: reserved Hannah avatar slot on the left, the label, the
// description, and the coming soon presentational action on the right.
// Per the nutrition model:
//   - The label is hardcoded to "Getting Started". The guide is coming
//     soon, so the first run vs returning distinction is moot; we read
//     no profile flag and add no DB column.
//   - The coming soon pill text is WHITE (not teal) and carries no icon
//     (icon removal carried from the nutrition model, Gary 2026-06-11).
//   - The guide name flows through getDisplayName('hannah'). Hannah is
//     the genomics agent guiding My Genetics.
//
// The action is non interactive while the guide is coming soon:
// aria-disabled, removed from the tab order, role note. When the
// walkthrough later ships this becomes the real trigger.
//
// Mobile (under 560px): avatar + text stack at the top, the action goes
// full width below. Desktop and tablet keep the horizontal layout.

import { getDisplayName } from '@/lib/getDisplayName';
import {
  CONSUMER_CARD_SUBHEAD,
  CONSUMER_CARD_TITLE,
  CONSUMER_METRIC_LABEL,
} from '@/lib/ui/consumerChrome';
import '@/components/body-tracker/hub/hub-card-frame.css';

// Reserved Hannah avatar slot. Leave empty to render the teal ring
// placeholder; set to a /public path when the real avatar lands.
const avatarSrc = '';

const LABEL = 'Getting Started';
const DESCRIPTION = `${getDisplayName('hannah')} walks you through My Genetics. Guide coming soon.`;
const COMING_SOON_TEXT = 'My Genetics Guide coming soon';

export function GeneticsGettingStartedStrip() {
  return (
    <section
      aria-labelledby="genetics-hub-guide-title"
      className="hub-card-frame relative flex min-h-[88px] flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md md:min-h-[96px] md:flex-row md:items-center md:gap-4 md:p-5"
      data-genetics-hub-guidance
    >
      <div className="flex items-center gap-3 md:gap-4">
        {/* Reserved Hannah avatar slot. When avatarSrc is empty we render
            the teal ring placeholder so the slot stays visibly reserved;
            when the real avatar lands it drops in here. */}
        <div className="flex-shrink-0">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={`${getDisplayName('hannah')}, your My Genetics guide`}
              className="h-12 w-12 rounded-full border-2 border-[#2DA5A0]/60 object-cover md:h-14 md:w-14"
            />
          ) : (
            <div
              aria-label={`${getDisplayName('hannah')} avatar slot reserved for the upcoming guided walkthrough`}
              role="img"
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#2DA5A0]/60 bg-[#1E3054]/60 backdrop-blur-sm md:h-14 md:w-14"
            >
              <span className={`${CONSUMER_METRIC_LABEL} font-medium tracking-widest text-[#2DA5A0]`}>
                {getDisplayName('hannah')}
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            id="genetics-hub-guide-title"
            className={CONSUMER_CARD_TITLE}
          >
            {LABEL}
          </h2>
          <p className={CONSUMER_CARD_SUBHEAD}>
            {DESCRIPTION}
          </p>
        </div>
      </div>

      {/* Coming soon presentational action. aria-disabled and removed from
          the tab order while the guide is not ready. The pill text is
          white per spec. Mobile: full width below text.
          Desktop: right aligned chip. */}
      <div className="flex md:ml-auto md:flex-shrink-0">
        <span
          aria-disabled="true"
          tabIndex={-1}
          role="note"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#1A2744]/60 bg-white/[0.08] px-3 py-2 text-sm font-medium text-white backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] md:w-auto"
        >
          {COMING_SOON_TEXT}
        </span>
      </div>
    </section>
  );
}

export default GeneticsGettingStartedStrip;

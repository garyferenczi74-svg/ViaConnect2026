'use client';

// Prompt 180 (2026-06-08): Getting Started guidance strip placeholder.
//
// Sits directly above the bento grid (Section 11). Renders the
// reserved Arnold avatar slot on the left, the dynamic label (Getting
// Started for first run, Refresh for returning users), the
// description, and the coming soon presentational action on the
// right. While GUIDE.ready is false the strip does not navigate and
// the action sits outside the tab order (aria-disabled). When the
// later tutorial series lands and flips GUIDE.ready to true, this
// component becomes the link or trigger for the walkthrough.
//
// Mobile (under 560px) per Section 5: avatar + text stack at the top,
// the action goes full width below. Desktop and tablet keep the
// horizontal layout.

import { GUIDE } from './hubConfig';
import { useGuideLabel } from './useGuideLabel';

const ACCENT_HEX = '#2DA5A0';

export function GuidanceStrip() {
  const labelState = useGuideLabel();
  const label =
    labelState === 'returning' ? GUIDE.returningLabel : GUIDE.firstRunLabel;

  return (
    <section
      aria-labelledby="hub-guide-title"
      className="relative flex min-h-[88px] flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md md:min-h-[96px] md:flex-row md:items-center md:gap-4 md:p-5"
      data-hub-guidance
    >
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-[2px]"
        style={{ backgroundColor: ACCENT_HEX }}
      />

      <div className="flex items-center gap-3 md:gap-4">
        {/* Reserved Arnold avatar slot. When GUIDE.avatarSrc is empty
            we render the teal ring placeholder so the slot stays
            visibly reserved; when the real avatar lands it drops in
            here. */}
        <div className="flex-shrink-0">
          {GUIDE.avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={GUIDE.avatarSrc}
              alt="Arnold, your Body Tracker guide"
              className="h-12 w-12 rounded-full border-2 border-[#2DA5A0]/60 object-cover md:h-14 md:w-14"
            />
          ) : (
            <div
              aria-label="Arnold avatar slot reserved for the upcoming guided walkthrough"
              role="img"
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#2DA5A0]/60 bg-[#1E3054]/60 backdrop-blur-sm md:h-14 md:w-14"
            >
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#2DA5A0]">
                Arnold
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            id="hub-guide-title"
            className="text-[14px] font-semibold leading-tight text-white md:text-[15px]"
          >
            {label}
          </h2>
          <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
            {GUIDE.description}
          </p>
        </div>
      </div>

      {/* Coming soon presentational action. aria-disabled and removed
          from the tab order while ready is false. When the walkthrough
          ships the parent flips GUIDE.ready and this becomes a real
          interactive control. Mobile: full width below text. Desktop:
          right aligned chip. */}
      <div className="flex md:ml-auto md:flex-shrink-0">
        <span
          aria-disabled={!GUIDE.ready}
          tabIndex={GUIDE.ready ? 0 : -1}
          role="note"
          className="inline-flex w-full items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/5 px-3 py-2 text-[12px] font-medium text-[#2DA5A0] md:w-auto"
        >
          {GUIDE.comingSoonText}
        </span>
      </div>
    </section>
  );
}

export default GuidanceStrip;

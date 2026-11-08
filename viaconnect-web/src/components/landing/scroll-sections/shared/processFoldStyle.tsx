/**
 * Fits the Process fold in one viewport from 1000px up, same idea as the
 * Features fold (#297). Scoped to #process so the hero and Features section
 * stay pixel-identical. Below 1000px the section padding and type scale are
 * the existing mobile/tablet rules.
 *
 * The nav click scrolls #process to the bar height. Padding is only a few
 * pixels, so the eyebrow sits just under the bar. Heading, assessment row,
 * protocol note, and tier cards then share the height that is left.
 */
export function ProcessFoldStyle() {
    return (
        <style>{`
          @media (min-width: 1000px) {
            #process {
              scroll-margin-top: var(--landing-nav-h, 78px);
              padding-top: 8px !important;
              padding-bottom: 16px !important;
              /* One gap for the intro, step row, protocol banner, tier row,
                 the spaces between steps, and the spaces between tier cards. */
              --process-gap: clamp(16px, calc(2.2vh + 0.9vw), 40px);
              --process-icon: clamp(32px, 6.4vh, 64px);
              --process-line-y: calc(clamp(4px, 0.7vh, 10px) + var(--process-icon) / 2);
              /* Clear space from the scaled circle plus its 18px glow to the label. */
              --process-circle-label-gap: clamp(10px, 1.4vh, 16px);
              --process-icon-glow: 18px;
            }
            #process .process-stack {
              display: flex;
              flex-direction: column;
              min-height: calc(100dvh - var(--landing-nav-h, 78px) - 8px - 22px);
            }
            #process .process-gap {
              flex: 0 0 var(--process-gap);
              width: 100%;
              height: var(--process-gap);
            }
            #process .process-intro,
            #process .process-steps,
            #process .process-note {
              margin-bottom: 0 !important;
            }
            #process .process-step-row,
            #process .process-tiers {
              gap: var(--process-gap) !important;
            }
            #process .process-eyebrow {
              font-size: clamp(11px, 1.45vh, 14px) !important;
              margin-bottom: clamp(3px, 0.5vh, 8px) !important;
            }
            #process .process-heading {
              font-size: clamp(1.25rem, 3.8vh, 3rem) !important;
              line-height: 1.12 !important;
              margin-bottom: clamp(4px, 0.7vh, 12px) !important;
            }
            #process .process-subtitle {
              font-size: clamp(0.8rem, 1.85vh, 1.125rem) !important;
              line-height: 1.35 !important;
            }
            #process .process-step-button {
              padding-top: clamp(4px, 0.7vh, 10px) !important;
              padding-bottom: clamp(4px, 0.8vh, 10px) !important;
            }
            #process .process-icon {
              width: var(--process-icon) !important;
              height: var(--process-icon) !important;
              margin-bottom: calc(var(--process-circle-label-gap) + var(--process-icon-glow) + var(--process-icon) * 0.04) !important;
            }
            #process .process-icon-glyph {
              width: clamp(14px, 2.4vh, 28px) !important;
              height: clamp(14px, 2.4vh, 28px) !important;
            }
            #process .process-label {
              font-size: clamp(11px, 1.45vh, 14px) !important;
              line-height: 1.25 !important;
            }
            #process .process-optional {
              margin-top: clamp(2px, 0.4vh, 6px) !important;
              font-size: clamp(8px, 1.05vh, 11px) !important;
            }
            #process .process-note {
              padding: 0 !important;
              margin-bottom: 0 !important;
              background: transparent !important;
              border: 0 !important;
              border-radius: 0 !important;
            }
            #process .process-note p {
              font-size: clamp(11px, 1.15vh, 13px) !important;
              line-height: 1.3 !important;
              white-space: nowrap;
            }
            #process .process-tier {
              padding: clamp(8px, 1.5vh, 28px) !important;
            }
            #process .process-tier-kicker {
              font-size: clamp(10px, 1.25vh, 12px) !important;
              margin-bottom: clamp(2px, 0.3vh, 8px) !important;
            }
            #process .process-tier-inputs {
              font-size: clamp(10px, 1.25vh, 12px) !important;
              margin-bottom: clamp(4px, 0.6vh, 12px) !important;
            }
            #process .process-tier-name {
              font-size: clamp(13px, 1.8vh, 20px) !important;
              margin-bottom: clamp(3px, 0.45vh, 10px) !important;
              line-height: 1.25 !important;
            }
            #process .process-tier-body {
              font-size: clamp(11px, 1.4vh, 14px) !important;
              line-height: 1.35 !important;
            }
          }
          @media (max-width: 999px) {
            #process {
              --process-circle-label-gap: clamp(10px, 1.4vh, 16px);
              --process-icon-glow: 18px;
            }
            #process .process-step-row {
              scroll-snap-type: x mandatory;
              scroll-padding-inline: 0;
            }
            #process .process-step-row > li {
              scroll-snap-align: start;
            }
            #process .process-step-button {
              gap: calc(var(--process-circle-label-gap) + var(--process-icon-glow) + 48px * 0.04) !important;
            }
          }
          #process .process-icon {
            transition: border-color 300ms ease, box-shadow 300ms ease, background-color 300ms ease, transform 300ms ease;
          }
          #process .process-icon[data-icon-active="true"] {
            transform: scale(1.08);
            border-color: #2DA5A0;
            background-color: rgba(45, 165, 160, 0.15);
            box-shadow: 0 0 18px rgba(45, 165, 160, 0.55);
          }
          #process .process-step-button:focus-visible .process-icon {
            outline: 2px solid #2DA5A0;
            outline-offset: 2px;
          }
          @media (prefers-reduced-motion: reduce) {
            #process .process-icon,
            #process .process-label,
            #process .process-step-row {
              transition: none !important;
              scroll-behavior: auto !important;
            }
          }
        `}</style>
    )
}

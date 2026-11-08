import { OLIVE_GREEN, ORANGE, TEAL } from '@/components/landing/HeroPillars'

const TIER_ACCENTS = [OLIVE_GREEN, TEAL, ORANGE] as const

/** Hover glow copied from the hero pillar card, keyed to the active step. */
function tierGlowCss(): string {
    const groups = [
        { tier: 0, steps: [0, 1, 2], border: '0.45', numeral: '0.40' },
        { tier: 1, steps: [3, 4], border: '0.40', numeral: '0.34' },
        { tier: 2, steps: [5, 6], border: '0.45', numeral: '0.40' },
    ]
    return groups.map(({ tier, steps, border, numeral }) => {
        const accent = TIER_ACCENTS[tier]
        if (!accent) return ''
        // #457a00 on #0d1225 is 3.57:1, but a softer rest opacity falls under 3:1.
        // #5ca300 keeps that olive hue (86°) and stays at 3.48:1 at 70% on the circle.
        const stroke = tier === 0 ? '#5ca300' : accent.primary
        const strokeRgb = tier === 0 ? '92, 163, 0' : accent.rgb
        const card = `.process-tiers .process-tier:nth-child(${tier + 1})`
        const inner = steps.map((step) => `#process:has([data-testid="process-steps"][data-active-index="${step}"]) ${card} .pillar-inner`).join(',\n')
        const numeralSel = steps.map((step) => `#process:has([data-testid="process-steps"][data-active-index="${step}"]) ${card} .pillar-numeral`).join(',\n')
        const line = steps.map((step) => `#process:has([data-testid="process-steps"][data-active-index="${step}"]) ${card} .pillar-inner > div.h-px`).join(',\n')
        return `
          ${inner} {
            border-color: rgba(${accent.rgb}, ${border});
            box-shadow:
              0 16px 36px -14px rgba(${accent.rgb}, 0.26),
              0 4px 12px -6px rgba(26, 39, 68, 0.45);
          }
          ${numeralSel} {
            -webkit-text-stroke-color: rgba(${accent.rgb}, ${numeral}) !important;
            transform: translate(-3px, 3px);
          }
          ${line} {
            opacity: 1;
          }
          #process .process-icon[data-tier="${tier}"] {
            border-color: rgba(${accent.rgb}, 0.7);
          }
          #process .process-icon[data-tier="${tier}"] .process-icon-glyph {
            color: rgba(${strokeRgb}, 0.7);
          }
          #process .process-icon[data-icon-active="true"][data-tier="${tier}"] {
            transform: scale(1.08);
            border-color: ${accent.primary};
            background-color: rgba(${accent.rgb}, 0.15);
            box-shadow: 0 0 18px rgba(${accent.rgb}, 0.55);
          }
          #process .process-icon[data-icon-active="true"][data-tier="${tier}"] .process-icon-glyph {
            color: ${stroke};
          }
          #process .process-step-button:focus-visible .process-icon[data-tier="${tier}"] {
            outline: 2px solid ${accent.primary};
            outline-offset: 2px;
          }
        `
    }).join('\n')
}

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
          }
          /* Desktop gives leftover fold height to the tier cards, not to
             empty gaps. Scoped to #process so the hero cards stay as they are. */
          @media (min-width: 1200px) {
            #process {
              --process-icon: clamp(52px, 8vh, 92px);
              --process-gap: clamp(16px, 1.8vh, 32px);
            }
            #process .process-stack {
              max-width: min(1680px, calc(100vw - 64px)) !important;
            }
            #process .process-heading {
              font-size: clamp(2.85rem, 5.6vh, 4.5rem) !important;
            }
            #process .process-subtitle {
              font-size: clamp(1.15rem, 2.2vh, 1.5rem) !important;
            }
            #process .process-note p {
              font-size: clamp(14px, 1vw, 18px) !important;
            }
            #process .process-label {
              font-size: clamp(13px, 1.5vh, 16px) !important;
            }
            #process .process-tiers {
              flex: 1 1 auto;
              align-items: stretch;
              max-height: calc(100dvh - var(--landing-nav-h, 78px) - 470px);
            }
            #process .process-tier,
            #process .pillar-card {
              height: 100%;
            }
            #process .pillar-inner {
              height: 100%;
              min-height: clamp(200px, 24vh, 340px) !important;
            }
            #process .pillar-eyebrow {
              font-size: 0.8rem !important;
            }
            #process .pillar-title {
              font-size: clamp(1.2rem, 2.4vh, 1.75rem) !important;
            }
            #process .pillar-body {
              font-size: clamp(0.95rem, 1.7vh, 1.125rem) !important;
              line-height: 1.4 !important;
            }
            #process .pillar-numeral {
              font-size: clamp(3.75rem, 8vh, 6.25rem) !important;
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
          #process .process-optional {
            visibility: hidden;
          }
          #process .process-step-button:hover .process-optional,
          #process .process-step-button:focus-visible .process-optional {
            visibility: visible;
          }
          #process .pillar-inner {
            transition: border-color 400ms ease, box-shadow 400ms ease;
          }
          ${tierGlowCss()}
          @media (prefers-reduced-motion: reduce) {
            #process .process-icon,
            #process .process-label,
            #process .process-step-row,
            #process .pillar-inner,
            #process .pillar-numeral {
              transition: none !important;
              scroll-behavior: auto !important;
            }
            #process .pillar-numeral {
              transform: none !important;
            }
          }
        `}</style>
    )
}

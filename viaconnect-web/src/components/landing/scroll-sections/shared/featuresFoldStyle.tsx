'use client'

/**
 * Fits the Features fold in one viewport from 1000px up.
 * Same vh clamp() pattern as the hero (#292–#294). Scoped to #features
 * so the hero stays pixel-identical. Below 1000px the coverflow plate
 * classes (196×220 at 390, then the tablet steps) are unchanged.
 *
 * The nav click scrolls the section to an 80px margin. This padding is
 * only a few pixels, so the eyebrow sits just under the bar. Heading,
 * subtitle, and the plate then share the height that is left. The
 * subtitle-to-card gap stays clamp(32px, 4vw, 64px) from #295: the
 * stage matches the plate, so that margin is the visible gap.
 */
export function FeaturesFoldStyle() {
    return (
        <style>{`
          @media (min-width: 1000px) {
            #features {
              padding-top: clamp(8px, 1.1vh, 16px) !important;
              --features-card-h: clamp(200px, 40vh, 420px);
              /* Width tracks the viewport so titles stay on one or two lines.
                 Height tracks vh so the plate, title bar, and controls fit. */
              --features-card-w: clamp(248px, 28vw, 380px);
            }
            #features .features-eyebrow {
              font-size: clamp(12px, 1.6vh, 14px) !important;
              margin-bottom: clamp(6px, 0.8vh, 10px) !important;
            }
            #features .features-heading {
              font-size: clamp(1.5rem, 4.8vh, 2.75rem) !important;
              margin-bottom: clamp(6px, 1vh, 14px) !important;
            }
            #features .features-subtitle {
              font-size: clamp(0.875rem, 2.2vh, 1.125rem) !important;
            }
            #features [data-testid="features-coverflow"] {
              margin-top: 0 !important;
            }
            #features [data-testid="features-coverflow"] [role="region"] {
              height: var(--features-card-h) !important;
            }
            #features [data-testid^="features-coverflow-card-"] {
              width: var(--features-card-w) !important;
              height: var(--features-card-h) !important;
            }
            #features .features-card-title {
              font-size: clamp(13px, 2.4vh, 20px) !important;
            }
          }
        `}</style>
    )
}

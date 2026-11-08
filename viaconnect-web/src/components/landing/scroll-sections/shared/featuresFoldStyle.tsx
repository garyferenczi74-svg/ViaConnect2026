'use client'

/**
 * Fits the Features fold in one viewport from 1000px up.
 * Same vh clamp() pattern as the hero (#292–#294). Scoped to #features
 * so the hero stays pixel-identical. Below 1000px the coverflow plate
 * classes (196×220 at 390, then the tablet steps) are unchanged.
 *
 * The nav click scrolls the section to an 80px margin. This padding is
 * only a few pixels, so the eyebrow sits just under the bar. Heading,
 * subtitle, and the plate then share the height that is left.
 *
 * From 1000px the column is exactly the viewport under that margin.
 * Free space splits evenly above and below the cards, and the plate
 * is short enough that the active card footer stays inside the screen.
 */
export function FeaturesFoldStyle() {
    return (
        <style>{`
          @media (min-width: 1000px) {
            #features {
              padding-top: 8px !important;
              padding-bottom: 0 !important;
              --features-card-h: clamp(160px, calc(100dvh - 5rem - 230px), 420px);
              /* Width tracks the viewport so titles stay on one or two lines. */
              --features-card-w: clamp(248px, 28vw, 380px);
            }
            #features .features-fold {
              display: flex;
              flex-direction: column;
              min-height: calc(100dvh - 5rem - 8px);
            }
            #features .features-intro {
              margin-bottom: 0 !important;
            }
            #features [data-testid="features-coverflow"] {
              margin-top: auto !important;
              margin-bottom: auto !important;
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
          /* Wider desktops can carry a larger plate. 1007px stays on the
             short-laptop clamp above. */
          @media (min-width: 1200px) {
            #features .features-heading {
              font-size: clamp(2.5rem, 4.8vh, 3.75rem) !important;
            }
            #features .features-subtitle {
              font-size: clamp(1.05rem, 2vh, 1.35rem) !important;
            }
          }
          @media (min-width: 1440px) {
            #features {
              --features-card-h: clamp(400px, calc(100dvh - 5rem - 280px), 540px);
              --features-card-w: clamp(360px, 22vw, 440px);
            }
            #features .features-card-title {
              font-size: clamp(18px, 2vh, 22px) !important;
            }
          }
        `}</style>
    )
}

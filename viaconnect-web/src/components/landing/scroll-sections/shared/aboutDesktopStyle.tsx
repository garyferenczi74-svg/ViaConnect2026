/**
 * Desktop scale for the About section. Starts at 1200px so the
 * 1007px laptop, tablet, and phone layouts stay on the Tailwind rules.
 * Scoped to #about. The hero is not affected.
 */
export function AboutDesktopStyle() {
    return (
        <style>{`
          @media (min-width: 1200px) {
            #about {
              padding-top: clamp(80px, 9vh, 128px) !important;
              padding-bottom: clamp(72px, 8vh, 120px) !important;
            }
            #about .about-stack {
              max-width: min(1520px, calc(100vw - 96px)) !important;
            }
            #about .about-intro {
              margin-bottom: clamp(36px, 5vh, 72px) !important;
            }
            #about .about-eyebrow {
              font-size: clamp(13px, 1vw, 16px) !important;
              margin-bottom: clamp(14px, 1.6vh, 22px) !important;
            }
            #about .about-heading {
              font-size: clamp(3.25rem, 4.2vw, 4.5rem) !important;
              line-height: 1.06 !important;
              max-width: 16em !important;
              margin-bottom: clamp(20px, 2.4vh, 36px) !important;
            }
            #about .about-lead {
              font-size: clamp(1.2rem, 1.35vw, 1.5rem) !important;
              line-height: 1.55 !important;
              max-width: 58rem !important;
            }
            #about .about-team {
              max-width: none !important;
              align-items: start;
              gap: clamp(20px, 1.8vw, 36px) !important;
              margin-bottom: clamp(24px, 3vh, 44px) !important;
            }
            #about .about-card,
            #about .about-leadership {
              padding: clamp(36px, 2.6vw, 52px) !important;
            }
            #about .about-leadership {
              max-width: none !important;
              margin-bottom: clamp(40px, 5vh, 80px) !important;
            }
            #about .about-name {
              font-size: clamp(1.85rem, 2vw, 2.45rem) !important;
              line-height: 1.2 !important;
              margin-bottom: 10px !important;
            }
            #about .about-role {
              font-size: clamp(0.95rem, 1.05vw, 1.15rem) !important;
              line-height: 1.3 !important;
              margin-bottom: clamp(18px, 2vh, 28px) !important;
            }
            #about .about-bio,
            #about .about-leadership p {
              font-size: clamp(1.25rem, 1.4vw, 1.65rem) !important;
              line-height: 1.65 !important;
            }
            #about .about-quote {
              padding-left: clamp(24px, 2vw, 40px) !important;
            }
            #about .about-quote-text {
              font-size: clamp(1.55rem, 2.1vw, 2.35rem) !important;
              line-height: 1.35 !important;
              white-space: normal !important;
              max-width: 28em;
            }
            #about .about-quote-source {
              font-size: clamp(0.85rem, 0.95vw, 1rem) !important;
            }
          }
        `}</style>
    )
}

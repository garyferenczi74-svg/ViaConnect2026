/**
 * Fits the Genomics heading and both panel rows in one short laptop
 * viewport. Scoped to #genomics so the hero stays unchanged. Below
 * 1000px the stacked and two-column layouts stay as they are.
 */
export function GenomicsFoldStyle() {
    return (
        <style>{`
          @media (min-width: 1000px) {
            #genomics {
              scroll-margin-top: var(--landing-nav-h, 78px);
              min-height: 0 !important;
              padding-top: 8px !important;
              padding-bottom: 12px !important;
            }
            #genomics .genomics-intro {
              margin-bottom: clamp(8px, 1.2vh, 14px) !important;
            }
            #genomics .genomics-eyebrow {
              font-size: clamp(11px, 1.35vh, 13px) !important;
              margin-bottom: clamp(2px, 0.4vh, 6px) !important;
            }
            #genomics .genomics-heading {
              font-size: clamp(1.45rem, 4.4vh, 2.35rem) !important;
              line-height: 1.08 !important;
              margin-bottom: clamp(2px, 0.35vh, 6px) !important;
            }
            #genomics .genomics-subline {
              font-size: clamp(0.8rem, 1.7vh, 1.05rem) !important;
              margin-bottom: clamp(2px, 0.4vh, 6px) !important;
            }
            #genomics .genomics-body {
              font-size: clamp(0.72rem, 1.45vh, 0.9rem) !important;
              line-height: 1.3 !important;
            }
            #genomics .genomics-panels {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: clamp(8px, 1vh, 12px) !important;
              margin-bottom: clamp(28px, 3.2vh, 36px) !important;
            }
            #genomics .genomics-panel {
              height: clamp(104px, calc((100dvh - var(--landing-nav-h, 78px) - 230px) / 2), 180px);
              padding: clamp(10px, 1.4vh, 16px) !important;
              overflow: hidden;
            }
            #genomics .genomics-panel-icon {
              width: clamp(16px, 2.2vh, 22px) !important;
              height: clamp(16px, 2.2vh, 22px) !important;
              margin-bottom: clamp(4px, 0.6vh, 8px) !important;
            }
            #genomics .genomics-panel-name {
              font-size: clamp(0.8rem, 1.7vh, 1rem) !important;
              margin-bottom: clamp(2px, 0.35vh, 6px) !important;
              line-height: 1.2 !important;
            }
            #genomics .genomics-panel-body {
              font-size: clamp(10px, 1.2vh, 12px) !important;
              line-height: 1.28 !important;
            }
            #genomics .genomics-actions {
              gap: 8px !important;
            }
            #genomics .genomics-cta {
              padding: 6px 12px !important;
              font-size: 12.5px !important;
              line-height: 1.2 !important;
            }
            #genomics .genomics-cta svg {
              width: 14px !important;
              height: 14px !important;
              margin-left: 6px !important;
            }
            #genomics .genomics-cta-choose {
              box-shadow: 0 0 10px rgba(255, 255, 255, 0.16) !important;
            }
            #genomics .genomics-cta-choose:hover {
              box-shadow: 0 0 14px rgba(255, 255, 255, 0.28) !important;
            }
            #genomics .genomics-cta-order {
              box-shadow: 0 0 10px rgba(183, 94, 24, 0.28) !important;
            }
            #genomics .genomics-cta-order:hover {
              box-shadow: 0 0 14px rgba(183, 94, 24, 0.4) !important;
            }
            #genomics .genomics-cta-upload {
              box-shadow: 0 0 10px rgba(45, 165, 160, 0.28) !important;
            }
            #genomics .genomics-cta-upload:hover {
              box-shadow: 0 0 14px rgba(45, 165, 160, 0.4) !important;
            }
          }
          /* Desktop uses the width and height the laptop caps were leaving
             empty. The 1000px block above stays the short-laptop fit. */
          @media (min-width: 1200px) {
            #genomics {
              padding-top: clamp(16px, 2vh, 36px) !important;
              padding-bottom: clamp(18px, 2.4vh, 40px) !important;
            }
            #genomics .genomics-stack {
              max-width: min(1680px, calc(100vw - 64px)) !important;
            }
            #genomics .genomics-intro {
              margin-bottom: clamp(14px, 2vh, 28px) !important;
            }
            #genomics .genomics-eyebrow {
              font-size: clamp(13px, 1.5vh, 16px) !important;
              margin-bottom: clamp(6px, 0.7vh, 10px) !important;
            }
            #genomics .genomics-heading {
              font-size: clamp(2.85rem, 6vh, 5rem) !important;
              margin-bottom: clamp(8px, 1vh, 14px) !important;
            }
            #genomics .genomics-subline {
              font-size: clamp(1.3rem, 2.5vh, 2rem) !important;
              margin-bottom: clamp(8px, 1vh, 14px) !important;
            }
            #genomics .genomics-body {
              font-size: clamp(1.05rem, 2vh, 1.4rem) !important;
              line-height: 1.45 !important;
              max-width: 64rem;
            }
            #genomics .genomics-panels {
              gap: clamp(16px, 1.2vw, 28px) !important;
              margin-bottom: clamp(28px, 3vh, 40px) !important;
              max-width: none;
              width: 100%;
            }
            #genomics .genomics-panel {
              height: clamp(200px, calc((100dvh - var(--landing-nav-h, 78px) - 390px) / 2), 380px);
              padding: clamp(20px, 2.4vh, 32px) !important;
            }
            #genomics .genomics-panel-icon {
              width: clamp(26px, 3vh, 36px) !important;
              height: clamp(26px, 3vh, 36px) !important;
              margin-bottom: clamp(10px, 1.4vh, 16px) !important;
            }
            #genomics .genomics-panel-name {
              font-size: clamp(1.4rem, 2.7vh, 2rem) !important;
              margin-bottom: clamp(6px, 0.8vh, 12px) !important;
            }
            #genomics .genomics-panel-body {
              font-size: clamp(14px, 1.7vh, 17px) !important;
              line-height: 1.45 !important;
            }
            #genomics .genomics-actions {
              gap: 14px !important;
            }
            #genomics .genomics-cta {
              padding: 12px 20px !important;
              font-size: 17px !important;
            }
            #genomics .genomics-cta svg {
              width: 18px !important;
              height: 18px !important;
              margin-left: 8px !important;
            }
          }
        `}</style>
    )
}

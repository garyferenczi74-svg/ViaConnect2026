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
          /* Desktop restores a fuller scale. The 1000px block above stays
             the short-laptop fit, so 1007px is unchanged. */
          @media (min-width: 1200px) {
            #genomics {
              padding-top: clamp(28px, 4vh, 72px) !important;
              padding-bottom: clamp(36px, 5vh, 80px) !important;
            }
            #genomics .genomics-intro {
              margin-bottom: clamp(18px, 2.6vh, 36px) !important;
            }
            #genomics .genomics-eyebrow {
              font-size: clamp(12px, 1.4vh, 14px) !important;
              margin-bottom: clamp(6px, 0.8vh, 12px) !important;
            }
            #genomics .genomics-heading {
              font-size: clamp(2.6rem, 5vh, 4.25rem) !important;
              margin-bottom: clamp(8px, 1vh, 16px) !important;
            }
            #genomics .genomics-subline {
              font-size: clamp(1.15rem, 2.1vh, 1.75rem) !important;
              margin-bottom: clamp(8px, 1vh, 14px) !important;
            }
            #genomics .genomics-body {
              font-size: clamp(1rem, 1.7vh, 1.2rem) !important;
              line-height: 1.45 !important;
              max-width: 48rem;
            }
            #genomics .genomics-panels {
              gap: clamp(16px, 1.4vw, 24px) !important;
              margin-bottom: clamp(32px, 4vh, 48px) !important;
              max-width: 1120px;
              margin-left: auto !important;
              margin-right: auto !important;
            }
            #genomics .genomics-panel {
              height: clamp(200px, 24vh, 300px);
              padding: clamp(18px, 2.2vh, 28px) !important;
            }
            #genomics .genomics-panel-icon {
              width: clamp(22px, 2.8vh, 32px) !important;
              height: clamp(22px, 2.8vh, 32px) !important;
              margin-bottom: clamp(10px, 1.4vh, 18px) !important;
            }
            #genomics .genomics-panel-name {
              font-size: clamp(1.25rem, 2.4vh, 1.75rem) !important;
              margin-bottom: clamp(6px, 0.8vh, 12px) !important;
            }
            #genomics .genomics-panel-body {
              font-size: clamp(13px, 1.5vh, 15px) !important;
              line-height: 1.45 !important;
            }
            #genomics .genomics-actions {
              gap: 12px !important;
            }
            #genomics .genomics-cta {
              padding: 10px 18px !important;
              font-size: 16px !important;
            }
            #genomics .genomics-cta svg {
              width: 16px !important;
              height: 16px !important;
              margin-left: 8px !important;
            }
          }
        `}</style>
    )
}

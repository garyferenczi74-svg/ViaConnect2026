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
              padding-bottom: 24px !important;
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
              margin-bottom: clamp(12px, 1.6vh, 20px) !important;
            }
            #genomics .genomics-panel {
              padding: clamp(8px, 1.15vh, 12px) !important;
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
          }
        `}</style>
    )
}

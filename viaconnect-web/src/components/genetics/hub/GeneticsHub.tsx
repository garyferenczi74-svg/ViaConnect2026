'use client';

// Prompt 191 Task E (2026-06-12): the My Genetics bento hub. The integration
// keystone that assembles the Task A to D pieces into the banded bento and
// becomes the body of the /genetics page.
//
// SOURCE ORDER EQUALS MOBILE ORDER. The children below are written in the
// spec's Section 6 MOBILE order (header, getting started strip, then in the
// grid: Blueprint, Your Variants, Upload DNA, Upload Lab, SNP Formulations,
// Order Panels). On a single column (mobile) this source order IS the rendered
// order, exactly as the spec wants, with no order classes doing anything.
//
// Source order ALSO equals the desktop order, so no order classes are needed
// anymore. At lg the grid is 12 columns:
//   Blueprint      col span 12  (full width band, row 1)
//   Your Variants  col span 12  (full width band, row 2)
//   Upload DNA     col span 3   (row 3, first of the four across action row)
//   Upload Lab     col span 3   (row 3, second)
//   SNP            col span 3   (row 3, third)
//   Order Panels   col span 3   (row 3, fourth)
// So Blueprint and Your Variants are stacked full width bands and the four
// action cards form one four across row beneath them.
//
// At md (tablet) it is a 2 column grid: Blueprint and Your Variants span both
// columns, and the four action cards fall into a 2 by 2 grid (each col span 1).
//
// DO NOT "fix" or reorder the child ordering. The source order is the mobile
// order and it already matches the desktop order, so reordering the children
// would silently break the mobile layout.
//
// Standing rules honored: tokens only, Instrument Sans (font-[Instrument_Sans]
// on the container), Lucide strokeWidth 1.5 (in the children), no emojis, no em
// or en dashes. This hub is a READ ONLY launcher: it opens no write path and
// adds no table; every child is presentation only (Your Variants reads ?test=
// via useSearchParams, which is why the page wraps the hub in Suspense).

import { GeneticsHubHeader } from './GeneticsHubHeader';
import { GeneticsGettingStartedStrip } from './GeneticsGettingStartedStrip';
import { GeneticBlueprintBento } from './GeneticBlueprintBento';
import {
  UploadDnaCard,
  UploadLabCard,
  SnpFormulationsCard,
  OrderPanelsCard,
} from './GeneticsActionCards';
import { YourVariantsCard } from './YourVariantsCard';
import { AssessmentRetakeCard } from '@/components/body-tracker/hub/AssessmentRetakeCard';
import { DSHEADisclaimer } from '@/components/compliance/DSHEADisclaimer';

export function GeneticsHub() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8 font-[Instrument_Sans]">
      <GeneticsHubHeader />
      <GeneticsGettingStartedStrip />

      {/* The bento grid. Source order is the spec's mobile order and already
          matches the desktop order, so no order classes are needed (see the
          file header for the full per breakpoint mapping). */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <GeneticBlueprintBento className="md:col-span-2 lg:col-span-12" />
        {/* Prompt 204i follow-up: anchor target for the Blueprint "Back to Your
            Variants" control (/genetics#your-variants). scroll-mt clears the 64px
            sticky brand header so the card lands below it. */}
        <div id="your-variants" className="scroll-mt-24 md:col-span-2 lg:col-span-12">
          <YourVariantsCard />
        </div>
        <UploadDnaCard className="md:col-span-1 lg:col-span-3" />
        <UploadLabCard className="md:col-span-1 lg:col-span-3" />
        <SnpFormulationsCard className="md:col-span-1 lg:col-span-3" />
        <OrderPanelsCard className="md:col-span-1 lg:col-span-3" />
      </div>

      {/* Update Your Assessment card, reused unchanged from the My Biology hub. */}
      <AssessmentRetakeCard />

      {/* Prompt 204 follow-up (Gary 2026-06-20): the validated #113 DSHEA
          disclaimer. The hub now carries a structure/function claim in the
          Blueprint subheading, so per the disclaimer component's own rule this US
          surface must show it. Uses the shared component (canonical 21 CFR
          101.93(d) text, suppression telemetry); no copy is authored here. */}
      <DSHEADisclaimer surface="genetics-hub" />
    </div>
  );
}

export default GeneticsHub;

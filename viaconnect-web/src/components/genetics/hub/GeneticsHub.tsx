'use client';

// Prompt 191 Task E (2026-06-12): the My Genetics bento hub. The integration
// keystone that assembles the Task A to D pieces into the banded bento and
// becomes the body of the /genetics page.
//
// SOURCE ORDER EQUALS MOBILE ORDER. The children below are written in the
// spec's Section 6 MOBILE order (header, getting started strip, then in the
// grid: hero, Your Variants, Upload DNA, Upload Lab, SNP Formulations, Order
// Panels). On a single column (mobile) this source order IS the rendered
// order, exactly as the spec wants, with no order classes doing anything.
//
// The lg:order-* utilities on each grid child rearrange ONLY at the lg
// breakpoint into the desktop ASYMMETRIC layout:
//   hero          order 1, col span 4, row span 2  (top left, dominant)
//   Upload DNA    order 2, col span 2              (right column, row 1)
//   Upload Lab    order 3, col span 2              (right column, row 2)
//   Your Variants order 4, col span 6              (full width band, row 3)
//   SNP           order 5, col span 3              (bottom left)
//   Order Panels  order 6, col span 3              (bottom right)
// So hero is 4 wide and 2 tall in the top left, Upload DNA + Upload Lab stack
// in the right column (rows 1 to 2, cols 5 to 6), Your Variants is a full
// width band (row 3, cols 1 to 6), and SNP + Order split the bottom row.
//
// At md (tablet) NO order classes apply: the cards fall into a 2 column
// priority stack in source order, with the hero and Your Variants spanning
// both columns.
//
// DO NOT "fix" the child ordering to match the desktop visual. The source
// order is mobile; the desktop arrangement lives entirely in the lg:order-*
// classes. Reordering the children would silently break the mobile layout.
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

export function GeneticsHub() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8 font-[Instrument_Sans]">
      <GeneticsHubHeader />
      <GeneticsGettingStartedStrip />

      {/* The bento grid. Source order is the spec's mobile order; the
          lg:order-* classes rearrange into the desktop asymmetric layout (see
          the file header for the full mapping). */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        <GeneticBlueprintBento className="md:col-span-2 lg:order-1 lg:col-span-4 lg:row-span-2" />
        <YourVariantsCard className="md:col-span-2 lg:order-4 lg:col-span-6" />
        <UploadDnaCard className="md:col-span-1 lg:order-2 lg:col-span-2" />
        <UploadLabCard className="md:col-span-1 lg:order-3 lg:col-span-2" />
        <SnpFormulationsCard className="md:col-span-1 lg:order-5 lg:col-span-3" />
        <OrderPanelsCard className="md:col-span-1 lg:order-6 lg:col-span-3" />
      </div>

      {/* Update Your Assessment card, reused unchanged from the My Biology hub. */}
      <AssessmentRetakeCard />
    </div>
  );
}

export default GeneticsHub;

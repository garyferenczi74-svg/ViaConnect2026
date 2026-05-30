/**
 * Prompt 170l Phase 1c-2: ODbL attribution footer.
 *
 * Per spec 3.6 + Gate 1 + Standing Rule for ODbL: attribution is
 * non-negotiable when displaying OFF data. Renders a small footer paragraph
 * at the bottom of ProductConfirmation and on the canonical Settings >
 * About > Attributions page (Phase 1c-3).
 *
 * Copy is the template per spec; Kelsey-reviewable. Future revision goes
 * through Kelsey before changing the wording.
 */

'use client';

import { ExternalLink } from 'lucide-react';

export function AttributionFooter(): JSX.Element {
  return (
    <div
      className="mt-6 px-4 py-3 text-center"
      style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 11, lineHeight: 1.5 }}
    >
      Packaged food data is provided by{' '}
      <a
        href="https://world.openfoodfacts.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 underline"
        style={{ color: 'rgba(45, 165, 160, 0.85)' }}
      >
        Open Food Facts
        <ExternalLink size={10} strokeWidth={1.5} aria-hidden="true" />
      </a>
      , licensed under the Open Database License (ODbL). Attribution
      maintained per license terms.
    </div>
  );
}

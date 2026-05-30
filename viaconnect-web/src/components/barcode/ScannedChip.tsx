/**
 * Prompt 170l Phase 1c-3: small chip rendered top-right of a meal item card
 * when the item originated from a barcode scan (item.from_barcode_scan ===
 * true). Surfaces the provenance signal on the result review per Hannah
 * §11.7 multi-product flow.
 */

'use client';

import { ScanBarcode } from 'lucide-react';

const TEAL = '#2DA5A0';

export function ScannedChip(): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{
        backgroundColor: 'rgba(45, 165, 160, 0.18)',
        color: TEAL,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.4,
      }}
      aria-label="Item added by barcode scan"
    >
      <ScanBarcode size={10} strokeWidth={2} aria-hidden="true" />
      SCANNED
    </span>
  );
}

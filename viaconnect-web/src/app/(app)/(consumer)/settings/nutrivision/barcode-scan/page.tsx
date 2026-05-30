/**
 * Prompt 170l Phase 1c-3: barcode scanning settings sub-page per Gate 2.
 *
 * Sub-page at /settings/nutrivision/barcode-scan (Gary chose this over the
 * 170j inline-section precedent during gate resolution). Parent page links
 * here via a Settings row.
 */

'use client';

import Link from 'next/link';
import { ArrowLeft, ScanBarcode } from 'lucide-react';
import { BarcodeSettingsSection } from '../components/BarcodeSettingsSection';

export default function BarcodeScanSettingsPage(): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/settings/nutrivision"
            aria-label="Back to NutriVision settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Barcode scanning
            </h1>
          </div>
        </header>

        <BarcodeSettingsSection />
      </div>
    </div>
  );
}

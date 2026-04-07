'use client';

// Naturopath Shop layout — same shape as the practitioner layout but mounts
// the PractitionerProvider with portalType='naturopath'. All page components
// underneath read portalType from context and adapt automatically (Orange
// accent, "Naturopath Price" labels, no "Prescribed" recommendation type).

import type { ReactNode } from 'react';
import { PractitionerProvider } from '@/context/PractitionerContext';
import { PatientBanner } from '@/components/practitioner/PatientBanner';

export default function NaturopathShopLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PractitionerProvider portalType="naturopath">
      <div className="min-h-screen bg-[#1A2744]">
        <PatientBanner />
        <div className="px-3 py-5 sm:px-4 md:px-8 md:py-6">{children}</div>
      </div>
    </PractitionerProvider>
  );
}

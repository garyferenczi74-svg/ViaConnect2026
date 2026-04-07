'use client';

// Practitioner Shop layout — wraps all /practitioner/shop/* routes with the
// PractitionerProvider (patient selector state) and renders the sticky
// PatientBanner. This layout sits inside the existing (app) layout (which
// handles auth) and only adds practitioner-specific client state.

import type { ReactNode } from 'react';
import { PractitionerProvider } from '@/context/PractitionerContext';
import { PatientBanner } from '@/components/practitioner/PatientBanner';

export default function PractitionerShopLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PractitionerProvider portalType="practitioner">
      <div className="min-h-screen bg-[#1A2744]">
        <PatientBanner />
        <div className="px-3 py-5 sm:px-4 md:px-8 md:py-6">{children}</div>
      </div>
    </PractitionerProvider>
  );
}

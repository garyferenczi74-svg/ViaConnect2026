'use client';

// BodyScanConsentGate.tsx  (Prompt #169b, Task 16, spec section 2)
//
// Client consent gate for the Body Scan capture entry. Composes with the age +
// premium gates: the scan capture entry requires a CURRENT biometric_consents
// record before capture begins. Wrap the entry like:
//
//   <BodyScanAgeGate>
//     <BodyScanConsentGate>
//       <RunScanButton ... />   // the normal entry, with its own premium gate
//     </BodyScanConsentGate>
//   </BodyScanAgeGate>
//
// Precedence: the age gate runs OUTSIDE this one (a minor / no-DOB user never
// reaches the consent screen). When the user lacks current consent, this gate
// renders BodyScanConsentScreen INSTEAD of the children, so capture cannot
// begin. When consent is present (or while it is still loading, to avoid a
// flash), the children render and their premium gate applies.
//
// CLIENT GATE ONLY: this is UX / defense-in-depth. The SERVER consent
// enforcement is the DEFERRED finalize trigger in migration
// 20260516000100_body_scan_consent_enforcement.sql, which is intentionally inert
// until launch (applying it before the consent flow ships would block all
// scans). That migration, once applied, is the non-bypassable enforcement; this
// component only steers the UX so a consenting user is never surprised at
// finalize.

import type { ReactNode } from 'react';
import { useBiometricConsent } from '@/hooks/body-tracker/useBiometricConsent';
import { BodyScanConsentScreen } from './BodyScanConsentScreen';

interface BodyScanConsentGateProps {
  children: ReactNode;
  className?: string;
}

export function BodyScanConsentGate({ children, className = '' }: BodyScanConsentGateProps) {
  const { hasCurrentConsent, isLoading } = useBiometricConsent();

  // While loading, render the children (their premium gate applies). Do not
  // flash the consent screen before the consent state resolves; the server gate
  // (deferred) is the real guarantee, so a brief optimistic render is safe.
  if (isLoading || hasCurrentConsent) {
    return <div className={className}>{children}</div>;
  }

  // No current consent: show the consent screen instead of the capture entry.
  // After a successful accept, useBiometricConsent re-derives hasCurrentConsent,
  // which re-renders this gate with the children.
  return (
    <div className={className}>
      <BodyScanConsentScreen />
    </div>
  );
}

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
import { Loader2 } from 'lucide-react';
import { useBiometricConsent } from '@/hooks/body-tracker/useBiometricConsent';
import { selectConsentGateRender } from '@/lib/body-tracker/biometric-consent';
import { BodyScanConsentScreen } from './BodyScanConsentScreen';

interface BodyScanConsentGateProps {
  children: ReactNode;
  className?: string;
}

export function BodyScanConsentGate({ children, className = '' }: BodyScanConsentGateProps) {
  // SINGLE source of consent truth for this subtree: the hook is hoisted HERE so
  // that when the consent screen records consent through the gate's own
  // recordConsent, the gate's hasCurrentConsent re-derives and the gate flips to
  // its children with no remount. The screen does NOT instantiate its own hook.
  const { hasCurrentConsent, isLoading, recordConsent } = useBiometricConsent();

  const render = selectConsentGateRender(isLoading, hasCurrentConsent);

  // While the consent state is still resolving, render a small inline loader,
  // NOT the children: a non-consented user must not be able to reach the capture
  // entry during the load window (the server consent enforcement is the deferred
  // apply-at-launch migration, so this client window matters at launch).
  if (render === 'loading') {
    return (
      <div className={`flex items-center justify-center py-6 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-white/50" strokeWidth={1.5} />
      </div>
    );
  }

  // Current consent on file: render the gated entry (its premium gate applies).
  if (render === 'children') {
    return <div className={className}>{children}</div>;
  }

  // No current consent: show the consent screen instead of the capture entry.
  // The screen writes through the gate's recordConsent, so a successful accept
  // refreshes hasCurrentConsent and immediately re-renders this gate with the
  // children. onConsented is the screen's post-write signal.
  return (
    <div className={className}>
      <BodyScanConsentScreen recordConsent={recordConsent} />
    </div>
  );
}

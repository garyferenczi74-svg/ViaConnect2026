'use client';

// Thin wrapper around the public PractitionerWaitlistForm that pre-fills the
// invitation token, optional target email, and (if provided) the expected
// credential type. The shared form handles validation + POST.

import { useEffect, useState } from 'react';
import { PractitionerWaitlistForm } from '../PractitionerWaitlistForm';

interface Props {
  token: string;
  prefillEmail?: string;
  expectedCredentialType?: string;
}

export function InvitedWaitlistForm({ token, prefillEmail, expectedCredentialType }: Props) {
  // The public form initializes from URL params; here we inject via document
  // sessionStorage so the form picks them up without prop-drilling. Keeps the
  // public form free of invitation-specific knowledge.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem('practitioner_invitation_token', token);
      if (prefillEmail) {
        window.sessionStorage.setItem('practitioner_invitation_email', prefillEmail);
      }
      if (expectedCredentialType) {
        window.sessionStorage.setItem(
          'practitioner_invitation_credential',
          expectedCredentialType,
        );
      }
    } catch {
      // sessionStorage may be unavailable in some contexts; ignore
    } finally {
      setReady(true);
    }
  }, [token, prefillEmail, expectedCredentialType]);

  if (!ready) return null;
  return <PractitionerWaitlistForm />;
}

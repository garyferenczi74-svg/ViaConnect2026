'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AI_CONSENT_DECLINE,
  AI_CONSENT_INTRO,
  AI_DATA_SHARING_CONSENT_VERSION,
  AI_VENDORS,
  PERMISSION_DISCLOSURES,
  type AiVendorDisclosure,
  type DisclosureKind,
} from '@/lib/ai/data-sharing/consent';

export interface AiSharingStatus {
  loading: boolean;
  gateEnabled: boolean;
  consented: boolean;
  version: string;
  intro: string;
  decline: string;
  vendors: readonly AiVendorDisclosure[];
  disclosures: Record<DisclosureKind, string>;
  refresh: () => Promise<void>;
}

const FALLBACK: Omit<AiSharingStatus, 'refresh'> = {
  loading: false,
  gateEnabled: false,
  consented: false,
  version: AI_DATA_SHARING_CONSENT_VERSION,
  intro: AI_CONSENT_INTRO,
  decline: AI_CONSENT_DECLINE,
  vendors: AI_VENDORS,
  disclosures: PERMISSION_DISCLOSURES,
};

export function useAiSharingStatus(): AiSharingStatus {
  const [state, setState] = useState<Omit<AiSharingStatus, 'refresh'>>({
    ...FALLBACK,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/consent', { credentials: 'same-origin' });
      if (!res.ok) {
        setState(FALLBACK);
        return;
      }
      const data = (await res.json()) as Partial<Omit<AiSharingStatus, 'refresh'>>;
      setState({
        loading: false,
        gateEnabled: data.gateEnabled === true,
        consented: data.consented === true,
        version: typeof data.version === 'string' ? data.version : FALLBACK.version,
        intro: typeof data.intro === 'string' ? data.intro : FALLBACK.intro,
        decline: typeof data.decline === 'string' ? data.decline : FALLBACK.decline,
        vendors: Array.isArray(data.vendors) ? data.vendors : FALLBACK.vendors,
        disclosures: data.disclosures ?? FALLBACK.disclosures,
      });
    } catch {
      setState(FALLBACK);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

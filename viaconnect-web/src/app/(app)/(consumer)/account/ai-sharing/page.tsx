'use client';

import { AiDataSharingConsent } from '@/components/ai/AiDataSharingConsent';
import { useAiSharingStatus } from '@/components/ai/useAiSharingStatus';

export default function AiSharingPage() {
  const status = useAiSharingStatus();

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-white/60">
        This choice controls whether ViaConnect may send personal data to the AI providers listed below.
        {status.gateEnabled
          ? ' The store gate is on, so AI features wait for an agree choice.'
          : ' The store gate is off, so existing AI features still run until that switch is turned on. An agree choice saved here is kept for when it turns on.'}
      </p>
      {status.loading ? (
        <p className="text-sm text-white/50">Loading your AI sharing choice…</p>
      ) : (
        <AiDataSharingConsent status={status} showSettingsActions />
      )}
    </div>
  );
}

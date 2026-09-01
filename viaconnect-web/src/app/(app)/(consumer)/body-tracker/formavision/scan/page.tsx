// Prompt 231: capture route server shell. Server component only (MediaPipe
// and camera DOM APIs never run server-side); resolves the user, reads
// height + consent status server-side, and renders the client capture
// experience via a dynamic(..., { ssr:false }) boundary.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { hasScanConsent } from '@/lib/scan/scanConsentGate';
import { readHeightCm } from '@/lib/scan/readHeightCm';
import { ScanExperienceLoader } from '@/components/scan/ScanExperienceLoader';
import { FORMAVISION_PATH } from '@/lib/body-tracker/compositionNav';

export default async function ScanCapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [consent, heightCm] = await Promise.all([
    hasScanConsent(user.id),
    readHeightCm(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-4" data-testid="scan-capture-header">
        <Link
          href={FORMAVISION_PATH}
          data-testid="scan-back-formavision"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white/70"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to FormaVision
        </Link>
      </div>
      <ScanExperienceLoader heightCm={heightCm} hasConsent={consent.ok} />
    </div>
  );
}

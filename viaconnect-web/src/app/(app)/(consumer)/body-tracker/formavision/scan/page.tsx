// Prompt 231: capture route server shell. Server component only (MediaPipe
// and camera DOM APIs never run server-side); resolves the user, reads
// height + consent status server-side, and renders the client capture
// experience via a dynamic(..., { ssr:false }) boundary.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { hasScanConsent } from '@/lib/scan/scanConsentGate';
import { readHeightCm } from '@/lib/scan/readHeightCm';
import { ScanExperienceLoader } from '@/components/scan/ScanExperienceLoader';
import { FORMAVISION_PATH, formavisionUploadHref } from '@/lib/body-tracker/compositionNav';

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
      <div
        className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        data-testid="scan-capture-header"
      >
        <Link
          href={FORMAVISION_PATH}
          data-testid="scan-back-formavision"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white/70"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to FormaVision
        </Link>
        <Link
          href={formavisionUploadHref()}
          data-testid="scan-header-upload-escape"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 sm:w-auto"
        >
          <ImagePlus size={16} strokeWidth={1.5} />
          Upload saved images
        </Link>
      </div>
      <ScanExperienceLoader heightCm={heightCm} hasConsent={consent.ok} />
    </div>
  );
}

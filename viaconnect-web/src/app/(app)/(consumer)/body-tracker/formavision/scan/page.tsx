// Prompt 231: capture route server shell. Server component only (MediaPipe
// and camera DOM APIs never run server-side); resolves the user, reads
// height + consent status server-side, and renders the client capture
// experience via a dynamic(..., { ssr:false }) boundary.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasScanConsent } from '@/lib/scan/scanConsentGate';
import { readHeightCm } from '@/lib/scan/readHeightCm';
import { ScanExperienceLoader } from '@/components/scan/ScanExperienceLoader';

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
      <ScanExperienceLoader heightCm={heightCm} hasConsent={consent.ok} />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PhotoSessionCapture } from '@/components/body-tracker/photos/PhotoSessionCapture';
import { ArnoldAnalysisCard } from '@/components/body-tracker/photos/ArnoldAnalysisCard';
import { LatestSessionGrid } from '@/components/body-tracker/photos/LatestSessionGrid';
import { PhotoSessionHistory } from '@/components/body-tracker/photos/PhotoSessionHistory';
import { ComparisonPanel } from '@/components/body-tracker/photos/ComparisonPanel';
import { RunScanButton } from '@/components/body-tracker/scanning/RunScanButton';
import { BodyScanAgeGate } from '@/components/body-tracker/scanning/BodyScanAgeGate';
import { ScanResultsPanel } from '@/components/body-tracker/scanning/ScanResultsPanel';
import { ScanOnboardingWalkthrough } from '@/components/body-tracker/scanning/ScanOnboardingWalkthrough';
import { BodyScanTier3ComingSoon } from '@/components/body-tracker/scanning/BodyScanTier3ComingSoon';
import { TierBadge } from '@/components/body-tracker/scanning/TierBadge';
import { ScanPdfExportButton } from '@/components/body-tracker/scanning/ScanPdfExportButton';

export default function PhotosPage() {
  const [open, setOpen] = useState(false);
  const [latestId, setLatestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLatestId(null); setLoading(false); return; }
    const { data } = await supabase
      .from('body_photo_sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestId((data as { id?: string } | null)?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload, refreshKey]);

  async function retryAnalysis(sessionId: string) {
    const supabase = createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhkcufyqjojdbvdrpky.supabase.co') + '/functions/v1/arnold-vision-analyze';
    await supabase
      .from('body_photo_sessions')
      .update({ arnold_status: 'queued', arnold_error: null } as never)
      .eq('id', sessionId);
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token ?? ''}` },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => {});
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* First-visit onboarding walkthrough; localStorage gate is inside the component */}
      <ScanOnboardingWalkthrough />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">Body progress photos</h2>
            <p className="text-xs text-white/45">4 pose sessions, analyzed by Arnold</p>
          </div>
          {/* Phase 1 always Tier 1; replace with scan_tier_log read in a later phase */}
          {latestId && <TierBadge tier={1} bosDelta={undefined} />}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {latestId && <ScanPdfExportButton sessionId={latestId} />}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/25 min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            New session
          </button>
        </div>
      </div>

      <PhotoSessionCapture
        open={open}
        onOpenChange={setOpen}
        onCompleted={() => setRefreshKey((k) => k + 1)}
      />

      {!loading && !latestId && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 p-8 text-center">
          <Camera className="h-10 w-10 mx-auto mb-3 text-white/30" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-white mb-1">No photo sessions yet</p>
          <p className="text-xs text-white/55 max-w-sm mx-auto">
            Start a session to capture front, back, left, and right poses. Arnold will analyze body
            composition, muscle development, posture, and progress over time.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Start first session
          </button>
        </div>
      )}

      {latestId && (
        <>
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Latest session</h3>
            <LatestSessionGrid sessionId={latestId} />
            <ArnoldAnalysisCard sessionId={latestId} onRetry={() => retryAnalysis(latestId)} />
            {/* Age gate (Prompt #169b, spec section 4) wraps the scan entry: under
                18 / no DOB hides the entry (and its premium gate) and shows a
                replacement card; it also surfaces the 3-in-7 slow-down advisory.
                Age gate takes precedence over the premium gate inside RunScanButton. */}
            <BodyScanAgeGate>
              <RunScanButton sessionId={latestId} onComplete={() => setRefreshKey((k) => k + 1)} />
            </BodyScanAgeGate>
          </section>

          <ScanResultsPanel sessionId={latestId} refreshKey={refreshKey} portalType="consumer" />

          {/* Honest Tier 3 roadmap surface (Prompt #169a, spec section 3.2):
              present but explicit about its GENEX360 + Bayesian-engine dependencies. */}
          <BodyScanTier3ComingSoon />

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Previous sessions</h3>
            <PhotoSessionHistory excludeSessionId={latestId} onSelect={(id) => setLatestId(id)} />
          </section>

          <ComparisonPanel defaultAfterSessionId={latestId} />
        </>
      )}
    </div>
  );
}

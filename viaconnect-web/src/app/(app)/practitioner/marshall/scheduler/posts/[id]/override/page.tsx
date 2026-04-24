// Prompt #125 P4: Override page.
//
// Renders the findings list + sign-off form. Redirects back to scan
// detail if the scan is not in an overridable decision state (clean,
// fail_closed, already overridden).

import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import OverrideSignoffForm from '@/components/scheduler/OverrideSignoffForm';
import type { SchedulerDecision, FindingsSummary, SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer',
  hootsuite: 'Hootsuite',
  later: 'Later',
  sprout_social: 'Sprout Social',
  planoly: 'Planoly',
};

interface ScanRow {
  id: string;
  scan_id: string;
  external_post_id: string;
  scheduled_at: string;
  decision: SchedulerDecision;
  findings_summary: FindingsSummary | null;
  connection: { platform: SchedulerPlatform } | null;
}

export default async function OverridePage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from('scheduler_scans')
    .select(
      'id, scan_id, external_post_id, scheduled_at, decision, findings_summary, connection:scheduler_connections(platform)',
    )
    .eq('id', params.id)
    .eq('practitioner_id', user.id)
    .maybeSingle();
  const row = data as ScanRow | null;
  if (!row) notFound();

  if (row.decision !== 'blocked' && row.decision !== 'findings_surfaced') {
    redirect(`/practitioner/marshall/scheduler/posts/${row.id}`);
  }

  const findingIds = row.findings_summary?.ruleIds ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap text-xs text-white/60">
        <Link href={`/practitioner/marshall/scheduler/posts/${row.id}`} className="inline-flex items-center gap-1 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scan detail
        </Link>
        <span className="text-white/20">/</span>
        <span>Override</span>
      </header>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-white">
              Override {row.connection?.platform ? PLATFORM_LABELS[row.connection.platform] : 'scheduler'} post
            </h1>
            <p className="text-xs text-white/60 mt-1">
              Post {row.external_post_id}, scheduled {new Date(row.scheduled_at).toLocaleString()}.
            </p>
          </div>
        </div>
      </div>

      {findingIds.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
          No specific finding ids are attached to this scan. An override cannot be signed when there is nothing to acknowledge.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <OverrideSignoffForm scanId={row.id} findingIds={findingIds} />
        </div>
      )}
    </div>
  );
}

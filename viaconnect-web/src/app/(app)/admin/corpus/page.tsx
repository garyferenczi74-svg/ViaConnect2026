// Prompt #170 Phase 1n: /admin/corpus telemetry dashboard.
//
// Server shell. Mirrors the auth-gate pattern used by /admin/jeffery:
//   1. createClient() server side.
//   2. supabase.auth.getUser() and redirect to login if none.
//   3. profiles.role check; redirect home if not admin.
// Per spec the initial allow-list is gary@farmceuticawellness.com; the
// profiles.role == admin check is the existing repository convention and
// covers Gary's account. The email check is layered on top as defense in
// depth so a profile mis-tag cannot expose telemetry to a non-Gary admin
// while the system rolls out.
//
// Telemetry comes from loadCorpusTelemetry() which queries user_meal_corpus,
// food_recognition_cache, and ai_route_audit in parallel. The six tiles are
// rendered by CorpusTelemetryClient which uses Recharts on the client side.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadCorpusTelemetry } from '@/lib/admin/corpus-telemetry';
import { CorpusTelemetryClient } from './CorpusTelemetryClient';

export const dynamic = 'force-dynamic';

const INITIAL_ALLOWLIST = new Set<string>([
  'gary@farmceuticawellness.com',
]);

export default async function CorpusTelemetryPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/admin/corpus');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin') redirect('/');

  const email = user.email ?? '';
  if (!INITIAL_ALLOWLIST.has(email.toLowerCase())) redirect('/');

  const supabaseAdmin = createAdminClient();
  const telemetry = await loadCorpusTelemetry(supabaseAdmin);

  return <CorpusTelemetryClient telemetry={telemetry} />;
}

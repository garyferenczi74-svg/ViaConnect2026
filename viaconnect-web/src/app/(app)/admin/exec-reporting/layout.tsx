// Prompt #105 Phase 2b review — admin role gate for /admin/exec-reporting/*.
//
// Server-rendered layout that redirects callers without the right role
// before any client code or data fetch runs. Defense-in-depth: the API
// routes and edge functions enforce the same contract, but failing at
// page render is better UX than loading a page that 403s on every action.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const ALLOWED = new Set(['admin', 'exec_reporting_admin', 'cfo', 'ceo']);

export default async function ExecReportingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { role: string | null } | null)?.role ?? null;
  if (!role || !ALLOWED.has(role)) {
    redirect('/admin');
  }

  return <>{children}</>;
}

// Prompt #105 Phase 2b review — board member gate for /board/*.
//
// Redirects any caller who does not have a board_members row linked to
// their auth.uid(). Exec admins / CFO / CEO are NOT admitted here even
// though they have full write access in /admin — the board portal is
// the recipient-side view, and impersonating a recipient would undermine
// the forensic integrity of the download audit trail.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('board_members')
    .select('member_id, access_revoked_at')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  const m = member as { member_id: string; access_revoked_at: string | null } | null;
  if (!m || m.access_revoked_at) {
    redirect('/');
  }

  return <>{children}</>;
}

// Prompt #95: governance admin guard.
//
// Governance endpoints enforce role === 'admin' strictly. Unlike the flag
// admin guard (which also admits founder + staff), pricing governance
// requires the admin role specifically so the RLS policies on every
// governance table (role = 'admin') match what the API route checks.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type GovernanceAdminCheck =
  | { kind: 'ok'; userId: string }
  | { kind: 'error'; response: NextResponse };

export async function requireGovernanceAdmin(): Promise<GovernanceAdminCheck> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return {
      kind: 'error',
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { role: string | null } | null)?.role;
  if (role !== 'admin') {
    return {
      kind: 'error',
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { kind: 'ok', userId: user.id };
}

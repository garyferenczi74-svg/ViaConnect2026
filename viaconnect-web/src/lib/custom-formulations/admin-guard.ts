// Prompt #97 Phase 2: strict admin guard for Level 4 administration.
// Matches the RLS policy (role = 'admin' only) across every Prompt #97
// table. Consolidated here so every API route uses the same check.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type AdminCheck =
  | { kind: 'ok'; userId: string }
  | { kind: 'error'; response: NextResponse };

export async function requireCustomFormulationsAdmin(): Promise<AdminCheck> {
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

/** Practitioner-owned-resource guard. Returns the caller's practitioner_id
 *  if they have one, or a 403 response otherwise. Used by enrollment routes. */
export async function requirePractitioner(): Promise<
  | { kind: 'ok'; userId: string; practitionerId: string }
  | { kind: 'error'; response: NextResponse }
> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return {
      kind: 'error',
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  const row = practitioner as { id: string; status: string } | null;
  if (!row || row.status !== 'active') {
    return {
      kind: 'error',
      response: NextResponse.json(
        { error: 'Only active practitioners may access Level 4 enrollment' },
        { status: 403 },
      ),
    };
  }
  return { kind: 'ok', userId: user.id, practitionerId: row.id };
}

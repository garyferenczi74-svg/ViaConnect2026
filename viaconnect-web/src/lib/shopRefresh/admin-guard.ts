// Prompt #106 — admin role gate for every /admin/shop/* route and API.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type ShopAdminCheck =
  | { kind: 'ok'; userId: string }
  | { kind: 'error'; response: NextResponse };

export async function requireShopAdmin(): Promise<ShopAdminCheck> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { kind: 'error', response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role: string | null } | null)?.role ?? null;
  if (role !== 'admin') {
    return { kind: 'error', response: NextResponse.json({ error: 'Forbidden', role }, { status: 403 }) };
  }
  return { kind: 'ok', userId: user.id };
}

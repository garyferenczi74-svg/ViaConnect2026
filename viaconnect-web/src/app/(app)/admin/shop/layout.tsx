// Prompt #106 — admin role gate for /admin/shop/*.
// Server-rendered redirect before any client code runs.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ShopAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/admin');
  return <>{children}</>;
}

// Prompt #101 map_waiver_admin_notify
// Triggered when a practitioner submits a waiver for review. Inserts
// an in-app notification for every user with role='admin'.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const { waiverId } = await req.json();
  if (!waiverId) return jsonResponse({ error: 'missing waiverId' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: waiver } = await (supabase as any)
    .from('map_waivers')
    .select('waiver_id, waiver_type, practitioner_id, scope_description')
    .eq('waiver_id', waiverId)
    .maybeSingle();
  if (!waiver) return jsonResponse({ error: 'waiver not found' }, 404);

  const { data: admins } = await (supabase as any)
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'compliance_officer']);
  const adminRows = (admins ?? []) as Array<{ id: string }>;

  for (const admin of adminRows) {
    await (supabase as any).from('notifications').insert({
      user_id: admin.id,
      notification_type: 'map_waiver_pending',
      title: `MAP waiver pending: ${waiver.waiver_type}`,
      message: `Scope: ${waiver.scope_description.slice(0, 200)}`,
    });
  }

  return jsonResponse({ sent: true, notified: adminRows.length });
});

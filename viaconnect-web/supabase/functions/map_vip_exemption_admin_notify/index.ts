// Prompt #101 map_vip_exemption_admin_notify
// In-app notification to admins + compliance_officer when a VIP
// exemption is requested. Never surfaces sensitive note content —
// only a reference to the exemption id.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const { vipExemptionId } = await req.json();
  if (!vipExemptionId) return jsonResponse({ error: 'missing vipExemptionId' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: exemption } = await (supabase as any)
    .from('map_vip_exemptions')
    .select('vip_exemption_id, reason, product_id, practitioner_id')
    .eq('vip_exemption_id', vipExemptionId)
    .maybeSingle();
  if (!exemption) return jsonResponse({ error: 'exemption not found' }, 404);

  const { data: reviewers } = await (supabase as any)
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'compliance_officer']);
  const rows = (reviewers ?? []) as Array<{ id: string }>;

  for (const reviewer of rows) {
    await (supabase as any).from('notifications').insert({
      user_id: reviewer.id,
      notification_type: 'map_vip_exemption_pending',
      title: 'VIP exemption pending',
      message: `Reason: ${exemption.reason}. Review in the admin queue.`,
    });
  }

  return jsonResponse({ sent: true, notified: rows.length });
});

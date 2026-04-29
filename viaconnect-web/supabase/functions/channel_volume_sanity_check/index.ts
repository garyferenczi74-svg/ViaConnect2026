// Prompt #102 Workstream A — nightly volume sanity check.
// Compares retail volume (from #100 monitoring observations) against
// practitioner wholesale order totals per channel; flags if retail > 2x
// wholesale sustained over 7 days.

// deno-lint-ignore-file no-explicit-any
import { getSupabaseClient, jsonResponse } from '../_operations_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

Deno.serve(async (_req) => {
  try {
    const supabase = getSupabaseClient() as any;

  const { data: channels } = await supabase
    .from('practitioner_verified_channels')
    .select('channel_id, practitioner_id, channel_url')
    .eq('state', 'verified');
  const rows = (channels ?? []) as Array<{ channel_id: string; practitioner_id: string; channel_url: string }>;

  let flaggedCount = 0;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  for (const ch of rows) {
    // Retail volume from MAP observations touching this channel's URL.
    const { data: obsRows } = await supabase
      .from('map_price_observations')
      .select('observed_price_cents')
      .eq('practitioner_id', ch.practitioner_id)
      .gte('observed_at', since.toISOString())
      .ilike('source_url', `${ch.channel_url}%`);
    const retailCents = (obsRows ?? []).reduce(
      (sum: number, r: { observed_price_cents: number }) => sum + Number(r.observed_price_cents ?? 0),
      0,
    );

    // Wholesale inventory totals for the practitioner in the same window.
    const { data: accruals } = await supabase
      .from('commission_accruals')
      .select('accrual_amount_cents')
      .eq('practitioner_id', ch.practitioner_id)
      .gte('accrual_date', since.toISOString().slice(0, 10));
    const wholesaleCents = (accruals ?? []).reduce(
      (sum: number, r: { accrual_amount_cents: number }) => sum + Number(r.accrual_amount_cents ?? 0),
      0,
    );

    const ratio = wholesaleCents > 0 ? retailCents / wholesaleCents : (retailCents > 0 ? Infinity : 0);
    const periodStart = since.toISOString().slice(0, 10);
    const periodEnd = new Date().toISOString().slice(0, 10);
    const flag = ratio > 2.0;

    await supabase.from('channel_volume_checks').insert({
      channel_id: ch.channel_id,
      check_period_start: periodStart,
      check_period_end: periodEnd,
      apparent_retail_volume_cents: retailCents,
      wholesale_inventory_volume_cents: wholesaleCents,
      ratio_observed: Number.isFinite(ratio) ? ratio.toFixed(2) : null,
      flag_triggered: flag,
    });

    if (flag) {
      await supabase.from('practitioner_verified_channels')
        .update({ state: 'volume_flagged' })
        .eq('channel_id', ch.channel_id);
      await supabase.from('practitioner_operations_audit_log').insert({
        action_category: 'channel', action_verb: 'channel.volume_flagged',
        target_table: 'practitioner_verified_channels', target_id: ch.channel_id,
        practitioner_id: ch.practitioner_id,
        context_json: { ratio, retailCents, wholesaleCents },
      });
      flaggedCount += 1;
    }
  }
    return jsonResponse({ checked: rows.length, flagged: flaggedCount });
  } catch (e) {
    if (isTimeoutError(e)) safeLog.warn('channel-volume-sanity-check', 'cycle timeout', { error: e });
    else safeLog.error('channel-volume-sanity-check', 'cycle failed', { error: e });
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});

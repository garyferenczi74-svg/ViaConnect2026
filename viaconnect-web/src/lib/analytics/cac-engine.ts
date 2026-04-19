// Prompt #94 Phase 2.1: CAC calculation engine.
//
// Two-layer split for testability:
//   * Pure cores (compute*) take pre-aggregated spend + conversions.
//   * DB-backed wrappers (build*) read from marketing_spend +
//     customer_acquisition_attribution and call the pure cores.
//
// Supports two attribution windows:
//   * same_month       (default) — spend in M divided by paid conversions in M
//   * trailing_3_month (smoothed) — sum of spend M, M-1, M-2 divided by sum
//     of paid conversions across the same trailing window
//
// Channel-level CAC uses first-touch attribution per spec: this attributes
// the conversion to the channel that originally drove awareness, matching
// how marketing budgets are evaluated.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcquisitionChannel } from './acquisition-attribution';

export type Confidence = 'high' | 'medium' | 'low';
export type CACMode = 'same_month' | 'trailing_3_month';

export interface CACResult {
  month: string;                  // YYYY-MM-01
  segment_type: 'overall' | 'channel';
  segment_value: string;          // 'all_paid' for overall, channel id for channel
  mode: CACMode;
  new_customers_count: number;
  marketing_spend_cents: number;
  cac_cents: number | null;
  confidence: Confidence;
  notes: string[];
}

export interface SpendBucket {
  monthIso: string;          // YYYY-MM-01
  spendCents: number;
}

export interface ConversionBucket {
  monthIso: string;          // YYYY-MM-01
  paidConversions: number;
}

// ---------------------------------------------------------------------------
// Pure cores
// ---------------------------------------------------------------------------

export function computeBlendedCAC(input: {
  monthIso: string;
  spendCents: number;
  paidConversions: number;
}): CACResult {
  const notes: string[] = [];

  if (input.paidConversions === 0 && input.spendCents > 0) {
    notes.push(
      `Marketing spend of $${(input.spendCents / 100).toFixed(2)} occurred but zero paid conversions captured. CAC undefined.`,
    );
  }
  if (input.paidConversions > 0 && input.paidConversions < 10) {
    notes.push(
      `Only ${input.paidConversions} paid conversions, low statistical confidence.`,
    );
  }

  const cac = input.paidConversions > 0
    ? Math.round(input.spendCents / input.paidConversions)
    : null;

  const confidence = blendedConfidence(input.paidConversions);

  return {
    month: input.monthIso,
    segment_type: 'overall',
    segment_value: 'all_paid',
    mode: 'same_month',
    new_customers_count: input.paidConversions,
    marketing_spend_cents: input.spendCents,
    cac_cents: cac,
    confidence,
    notes,
  };
}

export function computeChannelCAC(input: {
  monthIso: string;
  channel: AcquisitionChannel | string;
  channelSpendCents: number;
  channelConversions: number;
}): CACResult {
  const notes: string[] = [];
  if (input.channelConversions === 0 && input.channelSpendCents > 0) {
    notes.push(
      `Spent $${(input.channelSpendCents / 100).toFixed(2)} on ${input.channel} with zero attributed conversions this period.`,
    );
  }
  if (input.channelConversions > 0 && input.channelSpendCents === 0) {
    notes.push(
      `${input.channelConversions} conversions attributed to ${input.channel} but zero spend recorded. May be from prior-period spend or organic mis-attribution.`,
    );
  }

  const cac = input.channelConversions > 0 && input.channelSpendCents > 0
    ? Math.round(input.channelSpendCents / input.channelConversions)
    : null;

  const confidence = channelConfidence(input.channelConversions);

  return {
    month: input.monthIso,
    segment_type: 'channel',
    segment_value: String(input.channel),
    mode: 'same_month',
    new_customers_count: input.channelConversions,
    marketing_spend_cents: input.channelSpendCents,
    cac_cents: cac,
    confidence,
    notes,
  };
}

export interface SmoothedCACResult {
  month: string;
  spend_total_cents: number;
  conversions_total: number;
  cac_cents: number | null;
}

export function smoothTrailing3Month(input: {
  monthIso: string;
  buckets: Array<{ spend: SpendBucket; conv: ConversionBucket }>;
}): SmoothedCACResult {
  const spendTotal = input.buckets.reduce((s, b) => s + b.spend.spendCents, 0);
  const convTotal  = input.buckets.reduce((s, b) => s + b.conv.paidConversions, 0);
  const cac = convTotal > 0 && spendTotal > 0
    ? Math.round(spendTotal / convTotal)
    : null;
  return {
    month: input.monthIso,
    spend_total_cents: spendTotal,
    conversions_total: convTotal,
    cac_cents: cac,
  };
}

// ---------------------------------------------------------------------------
// Confidence thresholds
// ---------------------------------------------------------------------------

function blendedConfidence(n: number): Confidence {
  if (n >= 30) return 'high';
  if (n >= 10) return 'medium';
  return 'low';
}

function channelConfidence(n: number): Confidence {
  if (n >= 20) return 'high';
  if (n >= 5)  return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// DB wrappers
// ---------------------------------------------------------------------------

export interface BuildCACDeps {
  supabase: SupabaseClient | unknown;
}

export async function buildBlendedCAC(
  monthStartIso: string, // YYYY-MM-01
  mode: CACMode,
  deps: BuildCACDeps,
): Promise<CACResult> {
  const { spendCents, paidConversions } = await fetchAggregates(monthStartIso, mode, deps);
  const base = computeBlendedCAC({
    monthIso: monthStartIso,
    spendCents,
    paidConversions,
  });
  return { ...base, mode };
}

export async function buildChannelCAC(
  monthStartIso: string,
  channel: AcquisitionChannel | string,
  mode: CACMode,
  deps: BuildCACDeps,
): Promise<CACResult> {
  const { channelSpendCents, channelConversions } =
    await fetchChannelAggregates(monthStartIso, String(channel), mode, deps);
  const base = computeChannelCAC({
    monthIso: monthStartIso,
    channel,
    channelSpendCents,
    channelConversions,
  });
  return { ...base, mode };
}

async function fetchAggregates(
  monthStartIso: string,
  mode: CACMode,
  deps: BuildCACDeps,
): Promise<{ spendCents: number; paidConversions: number }> {
  const { startIso, endIso } = windowFor(monthStartIso, mode);
  const sb = deps.supabase as any;

  const [{ data: spendRows }, { data: convRows }] = await Promise.all([
    sb.from('marketing_spend')
      .select('amount_cents')
      .gte('spend_month', startIso)
      .lte('spend_month', endIso),
    sb.from('customer_acquisition_attribution')
      .select('user_id, is_paid_acquisition')
      .gte('acquired_at', `${startIso}T00:00:00.000Z`)
      .lte('acquired_at', `${endIso}T23:59:59.999Z`)
      .eq('is_paid_acquisition', true),
  ]);

  const spendCents = (spendRows ?? []).reduce(
    (s: number, r: { amount_cents: number }) => s + (r.amount_cents ?? 0), 0,
  );
  const paidConversions = (convRows ?? []).length;
  return { spendCents, paidConversions };
}

async function fetchChannelAggregates(
  monthStartIso: string,
  channel: string,
  mode: CACMode,
  deps: BuildCACDeps,
): Promise<{ channelSpendCents: number; channelConversions: number }> {
  const { startIso, endIso } = windowFor(monthStartIso, mode);
  const sb = deps.supabase as any;

  const [{ data: spendRows }, { data: convRows }] = await Promise.all([
    sb.from('marketing_spend')
      .select('amount_cents')
      .eq('channel', channel)
      .gte('spend_month', startIso)
      .lte('spend_month', endIso),
    sb.from('customer_acquisition_attribution')
      .select('user_id')
      .eq('first_touch_channel', channel)
      .gte('acquired_at', `${startIso}T00:00:00.000Z`)
      .lte('acquired_at', `${endIso}T23:59:59.999Z`),
  ]);

  const channelSpendCents = (spendRows ?? []).reduce(
    (s: number, r: { amount_cents: number }) => s + (r.amount_cents ?? 0), 0,
  );
  const channelConversions = (convRows ?? []).length;
  return { channelSpendCents, channelConversions };
}

function windowFor(monthStartIso: string, mode: CACMode): { startIso: string; endIso: string } {
  const start = new Date(`${monthStartIso}T00:00:00.000Z`);
  if (mode === 'trailing_3_month') {
    const startOfWindow = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 2, 1));
    const endOfMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return {
      startIso: toIsoDate(startOfWindow),
      endIso:   toIsoDate(endOfMonth),
    };
  }
  // same_month
  const endOfMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return {
    startIso: toIsoDate(start),
    endIso:   toIsoDate(endOfMonth),
  };
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

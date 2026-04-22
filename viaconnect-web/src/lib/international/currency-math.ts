// Prompt #111 — Currency-stable arithmetic helpers.
// Rule (§3.4, §7.4): business logic that sums *_cents values across rows MUST
// either operate in a single currency or explicitly route through
// convertToUsdCents with a declared FX date. Static analysis (Phase 6) uses
// the sumByCurrency and convertToUsdCents names as canonical markers.

import { createClient } from "@/lib/supabase/client";
import type { CurrencyCode, MoneyAmount } from "./types";

export function sumByCurrency(amounts: readonly MoneyAmount[]): Map<CurrencyCode, number> {
  const totals = new Map<CurrencyCode, number>();
  for (const a of amounts) {
    totals.set(a.currency_code, (totals.get(a.currency_code) ?? 0) + a.amount_cents);
  }
  return totals;
}

/**
 * Converts a cents amount from `from` currency to USD cents using the most
 * recent FX rate on or before `rateDate` in international_fx_rate_history.
 * Throws if no rate is available. Callers MUST pass a concrete rateDate to
 * prevent silent reporting inconsistencies.
 */
export async function convertToUsdCents(
  amountCents: number,
  from: CurrencyCode,
  rateDate: string,
): Promise<number> {
  if (from === "USD") return amountCents;
  const sb = createClient();
  const { data, error } = await sb
    .from("international_fx_rate_history")
    .select("rate, base_currency, quote_currency, rate_date")
    .eq("base_currency", "USD")
    .eq("quote_currency", from)
    .lte("rate_date", rateDate)
    .order("rate_date", { ascending: false })
    .order("retrieved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error(
      `Prompt #111: no FX rate USD->${from} on or before ${rateDate}. Cannot convert without a declared rate.`,
    );
  }
  const rate = Number((data as { rate: number }).rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Prompt #111: invalid FX rate ${rate} for USD->${from}`);
  }
  // rate is USD->quote. To convert quote amount to USD: amount / rate.
  return Math.round(amountCents / rate);
}

/** Aggregate amounts across currencies by converting each to USD on rateDate. */
export async function sumToUsdCents(
  amounts: readonly MoneyAmount[],
  rateDate: string,
): Promise<number> {
  let total = 0;
  for (const a of amounts) {
    total += await convertToUsdCents(a.amount_cents, a.currency_code, rateDate);
  }
  return total;
}

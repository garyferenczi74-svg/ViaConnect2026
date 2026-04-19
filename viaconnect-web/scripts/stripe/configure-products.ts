/**
 * One-time Stripe product + price configuration.
 * Creates Stripe Products and Prices for every membership tier (paid ones),
 * every GeneX360 product, and every outcome stack; stores the returned
 * Stripe IDs back into the corresponding Supabase tables.
 *
 * Run once per environment:
 *    STRIPE_SECRET_KEY=sk_live_... \
 *    NEXT_PUBLIC_SUPABASE_URL=... \
 *    SUPABASE_SERVICE_ROLE_KEY=... \
 *    npx tsx scripts/stripe/configure-products.ts
 *
 * Idempotent: if a Stripe ID is already stored on the row, the script skips it.
 * To recreate a product, clear the Stripe IDs on that row first.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_KEY) { console.error('STRIPE_SECRET_KEY is required'); process.exit(1); }
if (!SUPABASE_URL) { console.error('NEXT_PUBLIC_SUPABASE_URL is required'); process.exit(1); }
if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY is required'); process.exit(1); }

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' as never, typescript: true });
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function configureMembershipTiers(): Promise<void> {
  const { data, error } = await supabase
    .from('membership_tiers')
    .select('*')
    .neq('id', 'free');
  if (error) throw error;
  const tiers = (data ?? []) as Array<{
    id: string; display_name: string; description: string | null;
    monthly_price_cents: number; annual_price_cents: number;
    tier_level: number;
    stripe_product_id: string | null;
    stripe_monthly_price_id: string | null;
    stripe_annual_price_id: string | null;
  }>;

  for (const tier of tiers) {
    if (tier.stripe_product_id && tier.stripe_monthly_price_id && tier.stripe_annual_price_id) {
      console.log(`[skip] ${tier.display_name} already configured`);
      continue;
    }

    const product = tier.stripe_product_id
      ? await stripe.products.retrieve(tier.stripe_product_id)
      : await stripe.products.create({
          name: `ViaConnect ${tier.display_name}`,
          description: tier.description ?? undefined,
          metadata: { tier_id: tier.id, tier_level: String(tier.tier_level) },
        });

    const monthlyPrice = tier.stripe_monthly_price_id
      ? await stripe.prices.retrieve(tier.stripe_monthly_price_id)
      : await stripe.prices.create({
          product: product.id,
          unit_amount: tier.monthly_price_cents,
          currency: 'usd',
          recurring: { interval: 'month' },
          metadata: { tier_id: tier.id, billing_cycle: 'monthly' },
        });

    const annualPrice = tier.stripe_annual_price_id
      ? await stripe.prices.retrieve(tier.stripe_annual_price_id)
      : await stripe.prices.create({
          product: product.id,
          unit_amount: tier.annual_price_cents,
          currency: 'usd',
          recurring: { interval: 'year' },
          metadata: { tier_id: tier.id, billing_cycle: 'annual' },
        });

    const { error: updateErr } = await supabase
      .from('membership_tiers')
      .update({
        stripe_product_id: product.id,
        stripe_monthly_price_id: monthlyPrice.id,
        stripe_annual_price_id: annualPrice.id,
      })
      .eq('id', tier.id);
    if (updateErr) throw updateErr;

    console.log(`[ok]  ${tier.display_name}: ${product.id} (m:${monthlyPrice.id} a:${annualPrice.id})`);
  }
}

async function configureGeneX360(): Promise<void> {
  const { data, error } = await supabase.from('genex360_products').select('*');
  if (error) throw error;
  const products = (data ?? []) as Array<{
    id: string; display_name: string; description: string | null;
    panel_count: number; gifted_tier_id: string | null; gifted_months: number;
    price_cents: number;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
  }>;

  for (const p of products) {
    if (p.stripe_product_id && p.stripe_price_id) {
      console.log(`[skip] ${p.display_name} already configured`);
      continue;
    }

    const sp = p.stripe_product_id
      ? await stripe.products.retrieve(p.stripe_product_id)
      : await stripe.products.create({
          name: p.display_name,
          description: p.description ?? undefined,
          metadata: {
            product_type: 'genex360',
            panel_count: String(p.panel_count),
            gifted_tier: p.gifted_tier_id ?? '',
            gifted_months: String(p.gifted_months),
          },
        });

    const price = p.stripe_price_id
      ? await stripe.prices.retrieve(p.stripe_price_id)
      : await stripe.prices.create({
          product: sp.id,
          unit_amount: p.price_cents,
          currency: 'usd',
          metadata: { genex360_product_id: p.id },
        });

    await supabase
      .from('genex360_products')
      .update({ stripe_product_id: sp.id, stripe_price_id: price.id })
      .eq('id', p.id);
    console.log(`[ok]  ${p.display_name}: ${sp.id} (${price.id})`);
  }
}

async function configureOutcomeStacks(): Promise<void> {
  // Compute bundle price from components: sum(msrp in cents) * (1 - discount).
  const { data: stacks } = await supabase.from('outcome_stacks').select('*');
  const { data: comps } = await supabase.from('outcome_stack_components').select('stack_id, sku');
  const { data: skus } = await supabase.from('master_skus').select('sku, msrp');
  const skuMap = new Map(
    ((skus ?? []) as Array<{ sku: string; msrp: number }>).map((s) => [s.sku, s]),
  );

  for (const stack of ((stacks ?? []) as Array<{
    id: string; display_name: string; description: string;
    bundle_discount_percent: number;
    stripe_product_id: string | null; stripe_price_id: string | null;
  }>)) {
    if (stack.stripe_product_id && stack.stripe_price_id) {
      console.log(`[skip] ${stack.display_name} already configured`);
      continue;
    }
    const components = ((comps ?? []) as Array<{ stack_id: string; sku: string }>).filter(
      (c) => c.stack_id === stack.id,
    );
    const individualCents = components.reduce((sum, c) => {
      const msrp = Number(skuMap.get(c.sku)?.msrp ?? 0);
      return sum + Math.round(msrp * 100);
    }, 0);
    const bundleCents = Math.round(individualCents * (1 - stack.bundle_discount_percent / 100));
    if (bundleCents <= 0) {
      console.warn(`[warn] ${stack.display_name} has no computed price; skipping`);
      continue;
    }

    const product = stack.stripe_product_id
      ? await stripe.products.retrieve(stack.stripe_product_id)
      : await stripe.products.create({
          name: stack.display_name,
          description: stack.description,
          metadata: { product_type: 'outcome_stack', stack_id: stack.id },
        });

    const price = stack.stripe_price_id
      ? await stripe.prices.retrieve(stack.stripe_price_id)
      : await stripe.prices.create({
          product: product.id,
          unit_amount: bundleCents,
          currency: 'usd',
          metadata: { stack_id: stack.id },
        });

    await supabase
      .from('outcome_stacks')
      .update({ stripe_product_id: product.id, stripe_price_id: price.id })
      .eq('id', stack.id);
    console.log(`[ok]  ${stack.display_name}: ${product.id} (${price.id}) @ $${(bundleCents / 100).toFixed(2)}`);
  }
}

async function main(): Promise<void> {
  console.log('Configuring Stripe products...');
  await configureMembershipTiers();
  await configureGeneX360();
  await configureOutcomeStacks();
  console.log('Configuration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

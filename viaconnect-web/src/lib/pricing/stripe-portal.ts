// Stripe Customer Portal: self-service billing management for existing
// subscribers. Generates a short-lived redirect URL.

import { getStripe, getSiteOrigin } from './stripe';
import type { PricingSupabaseClient } from './supabase-types';

export async function createCustomerPortalSession(args: {
  client: PricingSupabaseClient;
  userId: string;
  returnPath?: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();

  const { data: membership, error } = await args.client
    .from('memberships')
    .select('stripe_customer_id')
    .eq('user_id', args.userId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to look up customer: ${error.message}`);
  const customerId = (membership as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    throw new Error('No Stripe customer on file. User has not completed a paid checkout yet.');
  }

  const origin = getSiteOrigin();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}${args.returnPath ?? '/account?portal=return'}`,
  });
  return { url: session.url };
}

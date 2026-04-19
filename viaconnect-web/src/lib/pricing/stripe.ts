// Stripe server-side singleton. Never import this from client code.
// The publishable key is loaded via @stripe/stripe-js on the client side.

import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  cached = new Stripe(key, {
    // Pin to a known API version so upgrades are intentional.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: '2024-06-20' as any,
    typescript: true,
  });
  return cached;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  return secret;
}

export function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'https://via-connect2026.vercel.app'
  ).replace(/\/$/, '').replace(/^(?!https?:\/\/)/, 'https://');
}

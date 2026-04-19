'use client';

// Practitioner billing: subscription tier, period, status, and a placeholder
// invoice history. Cancel + update payment method open the Stripe customer
// portal (wired in a follow-up phase).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  CreditCard,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

const supabase = createClient();

interface PractitionerRow {
  id: string;
  display_name: string | null;
  practice_name: string | null;
  account_status: string;
}

interface SubscriptionRow {
  tier_id: string;
  billing_cycle: string;
  status: string;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  is_annual_prepay: boolean;
  cancel_at_period_end: boolean;
  payment_method: string | null;
}

interface TierRow {
  id: string;
  display_name: string;
  monthly_price_cents: number;
  annual_price_cents: number;
  description: string | null;
  co_branding_level: string;
  wholesale_discount_percent: number;
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PractitionerBillingPage() {
  const [loading, setLoading] = useState(true);
  const [practitioner, setPractitioner] = useState<PractitionerRow | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [tier, setTier] = useState<TierRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: pRow } = await (supabase as any)
        .from('practitioners')
        .select('id, display_name, practice_name, account_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setPractitioner((pRow ?? null) as PractitionerRow | null);

      if (!pRow) { setLoading(false); return; }

      const { data: subRow } = await (supabase as any)
        .from('practitioner_subscriptions')
        .select(
          'tier_id, billing_cycle, status, started_at, current_period_start, current_period_end, is_annual_prepay, cancel_at_period_end, payment_method',
        )
        .eq('practitioner_id', pRow.id)
        .in('status', ['active', 'trialing', 'past_due', 'paused'])
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setSubscription((subRow ?? null) as SubscriptionRow | null);

      if (subRow) {
        const { data: tierRow } = await (supabase as any)
          .from('practitioner_tiers')
          .select('id, display_name, monthly_price_cents, annual_price_cents, description, co_branding_level, wholesale_discount_percent')
          .eq('id', subRow.tier_id)
          .maybeSingle();
        if (cancelled) return;
        setTier((tierRow ?? null) as TierRow | null);
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-portal-green/30 bg-portal-green/10">
          <CreditCard className="h-5 w-5 text-portal-green" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Billing</h1>
          <p className="text-xs text-white/50">
            Subscription, payment method, and invoices for your ViaCura practitioner account.
          </p>
        </div>
      </header>

      {loading ? (
        <CenteredLoader />
      ) : !practitioner ? (
        <NoticeCard>
          We could not locate a practitioner account on this login. Contact ViaCura support if you
          believe this is an error.
        </NoticeCard>
      ) : !subscription || !tier ? (
        <NoticeCard>
          No active subscription on file. If you were just invited from the founding cohort, your
          subscription will be activated during onboarding.
        </NoticeCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <SubscriptionCard subscription={subscription} tier={tier} />
          <SidePanel subscription={subscription} />
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  tier,
}: {
  subscription: SubscriptionRow;
  tier: TierRow;
}) {
  const isAnnual = subscription.billing_cycle === 'annual';
  const cents = isAnnual ? tier.annual_price_cents : tier.monthly_price_cents;
  const cycleLabel = isAnnual ? 'per year' : 'per month';

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-portal-green">Current plan</p>
          <h2 className="text-lg font-semibold text-white md:text-xl">{tier.display_name}</h2>
          {tier.description && (
            <p className="mt-1 text-sm text-white/60">{tier.description}</p>
          )}
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="mb-5 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-white">{fmtUsd(cents)}</span>
        <span className="text-sm text-white/55">{cycleLabel}</span>
      </div>

      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <Field label="Billing cycle" value={isAnnual ? 'Annual prepay' : 'Monthly'} />
        <Field
          label="Wholesale discount"
          value={`${tier.wholesale_discount_percent}% off MSRP`}
        />
        <Field
          label="Co-branding"
          value={tier.co_branding_level === 'heavy_white_label' ? 'White-label' : 'Medium co-branded'}
        />
        <Field
          label="Renews on"
          value={new Date(subscription.current_period_end).toLocaleDateString()}
        />
        <Field
          label="Started"
          value={new Date(subscription.started_at).toLocaleDateString()}
        />
        <Field
          label="Payment method"
          value={subscription.payment_method ?? 'Not set'}
        />
      </dl>

      {subscription.cancel_at_period_end && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>
            Subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}.
            Resume any time before then.
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg border border-portal-green/40 bg-portal-green/10 px-4 py-2 text-sm font-medium text-portal-green transition-colors hover:bg-portal-green/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60">
          <CreditCard className="h-4 w-4" strokeWidth={1.5} />
          Update payment method
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          Switch billing cycle
        </button>
      </div>
    </section>
  );
}

function SidePanel({ subscription }: { subscription: SubscriptionRow }) {
  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Next renewal
        </p>
        <div className="flex items-center gap-2 text-sm text-white">
          <Calendar className="h-4 w-4 text-portal-green" strokeWidth={1.5} />
          {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
        <p className="mt-1 text-xs text-white/45">
          Period started {new Date(subscription.current_period_start).toLocaleDateString()}.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Invoices
        </p>
        <p className="text-sm text-white/60">
          Stripe invoice history will appear here after the customer portal is wired in a follow up
          phase.
        </p>
        <Link
          href="#"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-portal-green hover:text-portal-green/80"
        >
          Open customer portal
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </section>
    </aside>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string; Icon: LucideIcon }> = {
    active:    { label: 'Active',    tone: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30', Icon: CheckCircle2 },
    trialing:  { label: 'Trialing',  tone: 'bg-portal-green/15 text-portal-green border border-portal-green/30', Icon: CheckCircle2 },
    past_due:  { label: 'Past due',  tone: 'bg-amber-500/15 text-amber-300 border border-amber-500/30', Icon: AlertCircle },
    paused:    { label: 'Paused',    tone: 'bg-white/10 text-white/70', Icon: AlertCircle },
    canceled:  { label: 'Canceled',  tone: 'bg-red-500/15 text-red-300 border border-red-500/30', Icon: AlertCircle },
  };
  const cfg = map[status] ?? map.active;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${cfg.tone}`}>
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {cfg.label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</dt>
      <dd className="text-sm text-white">{value}</dd>
    </div>
  );
}

function NoticeCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70">
      {children}
    </div>
  );
}

function CenteredLoader() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-12 text-white/50">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
      Loading
    </div>
  );
}

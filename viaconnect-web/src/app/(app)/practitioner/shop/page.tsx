'use client';

// Practitioner wholesale shop. Pulls genex360_products as the initial
// catalog (other supplement catalogs join here as they come online) and
// renders pricing through the wholesale engine from Phase 3. Banner shows
// the live MOQ progress; cart is a follow-up phase.

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ShoppingBag,
  Tag,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react';
import {
  buildWholesaleContext,
  calculateWholesalePrice,
  validateWholesaleMOQ,
  MIN_WHOLESALE_ORDER_CENTS,
  type WholesalePricingContext,
} from '@/lib/pricing/wholesale-engine';

const supabase = createClient();

interface CatalogItem {
  sku: string;
  name: string;
  description: string | null;
  msrp_cents: number;
  category: string | null;
  image_url: string | null;
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PractitionerShopPage() {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [wholesaleCtx, setWholesaleCtx] = useState<WholesalePricingContext | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const ctx = await buildWholesaleContext(supabase as any, user.id);
      if (cancelled) return;
      setWholesaleCtx(ctx);
      setEligible(!!ctx?.isActivePractitioner && !!ctx?.hasRequiredCertification);

      // Initial catalog: GeneX360 SKUs. Future phases extend with
      // FarmCeutica supplement catalogs.
      const { data: catalog } = await (supabase as any)
        .from('genex360_products')
        .select('id, name, description, price_cents, category, image_url')
        .eq('is_active', true);

      const mapped = (catalog ?? []).map((row: any) => ({
        sku: String(row.id ?? row.sku ?? ''),
        name: String(row.name ?? ''),
        description: row.description ?? null,
        msrp_cents: Number(row.price_cents ?? 0),
        category: row.category ?? null,
        image_url: row.image_url ?? null,
      })) as CatalogItem[];

      if (cancelled) return;
      setItems(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([sku, qty]) => {
        const item = items.find((i) => i.sku === sku);
        if (!item) return null;
        const price = wholesaleCtx
          ? calculateWholesalePrice(item.msrp_cents, wholesaleCtx)
          : { wholesaleCents: item.msrp_cents, savingsCents: 0, originalMsrpCents: item.msrp_cents, discountPercent: 0 };
        return { item, qty, lineTotal: price.wholesaleCents * qty, price };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, items, wholesaleCtx]);

  const wholesaleTotal = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const moq = validateWholesaleMOQ(wholesaleTotal);

  function adjust(sku: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const cur = next[sku] ?? 0;
      const updated = Math.max(0, cur + delta);
      if (updated === 0) delete next[sku];
      else next[sku] = updated;
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-portal-green/30 bg-portal-green/10">
            <ShoppingBag className="h-5 w-5 text-portal-green" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Wholesale Shop</h1>
            <p className="text-xs text-white/50">
              FarmCeutica products at wholesale pricing for your practice and patients.
            </p>
          </div>
        </div>
        {eligible && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-portal-green/40 bg-portal-green/15 px-3 py-1 text-xs font-medium text-portal-green">
            <Tag className="h-3 w-3" strokeWidth={1.5} />
            Practitioner Wholesale, {wholesaleCtx?.wholesaleDiscountPercent ?? 50}% off MSRP
          </span>
        )}
      </header>

      {!eligible && !loading && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-amber-200">Wholesale not available yet.</p>
            <p className="mt-1 text-amber-100/80">
              Wholesale pricing unlocks once your practitioner subscription is active and you have
              completed the Foundation certification. Visit the Certification page to begin.
            </p>
          </div>
        </div>
      )}

      <MoqBanner totalCents={wholesaleTotal} meets={moq.meetsMoq} shortfall={moq.shortfallCents} />

      {loading ? (
        <CenteredLoader />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center text-sm text-white/55">
          The wholesale catalog is being populated. New SKUs land here as the FarmCeutica supplement
          line is published.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const price = wholesaleCtx
              ? calculateWholesalePrice(item.msrp_cents, wholesaleCtx)
              : { wholesaleCents: item.msrp_cents, savingsCents: 0, originalMsrpCents: item.msrp_cents, discountPercent: 0 };
            const qty = cart[item.sku] ?? 0;
            return (
              <ProductCard
                key={item.sku}
                item={item}
                wholesaleCents={price.wholesaleCents}
                savingsCents={price.savingsCents}
                quantity={qty}
                onAdd={() => adjust(item.sku, 1)}
                onRemove={() => adjust(item.sku, -1)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function MoqBanner({
  totalCents,
  meets,
  shortfall,
}: {
  totalCents: number;
  meets: boolean;
  shortfall: number;
}) {
  if (totalCents === 0) return null;
  const pct = Math.min(100, Math.round((totalCents / MIN_WHOLESALE_ORDER_CENTS) * 100));
  return (
    <section
      className={`mb-6 rounded-xl border p-4 ${
        meets
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-portal-green/30 bg-portal-green/10'
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-white">
          {meets ? 'Minimum order met' : 'Minimum order $500'}
        </span>
        <span className="text-white/70">
          {fmtUsd(totalCents)} of {fmtUsd(MIN_WHOLESALE_ORDER_CENTS)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full transition-all ${
            meets ? 'bg-emerald-400' : 'bg-portal-green'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!meets && (
        <p className="mt-2 text-xs text-white/65">
          Add {fmtUsd(shortfall)} more to qualify for wholesale checkout.
        </p>
      )}
      {meets && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-200">
          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
          Cart qualifies for wholesale checkout.
        </p>
      )}
    </section>
  );
}

function ProductCard({
  item,
  wholesaleCents,
  savingsCents,
  quantity,
  onAdd,
  onRemove,
}: {
  item: CatalogItem;
  wholesaleCents: number;
  savingsCents: number;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const showStrike = savingsCents > 0;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          {item.category && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-portal-green">
              {item.category}
            </p>
          )}
          <h3 className="text-base font-semibold text-white">{item.name}</h3>
        </div>
        <Package className="h-4 w-4 text-white/40" strokeWidth={1.5} />
      </div>
      {item.description && (
        <p className="text-sm leading-relaxed text-white/65">{item.description}</p>
      )}
      <div className="mt-auto flex items-baseline gap-2">
        <span className="text-lg font-semibold text-white">{fmtUsd(wholesaleCents)}</span>
        {showStrike && (
          <span className="text-xs text-white/40 line-through">
            {fmtUsd(item.msrp_cents)}
          </span>
        )}
        {showStrike && (
          <span className="text-[10px] font-semibold text-portal-green">
            save {fmtUsd(savingsCents)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
        <button
          type="button"
          onClick={onRemove}
          disabled={quantity <= 0}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-white">
          {quantity}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-portal-green/40 bg-portal-green/15 text-portal-green transition-colors hover:bg-portal-green/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </article>
  );
}

function CenteredLoader() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-12 text-white/50">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
      Loading catalog
    </div>
  );
}

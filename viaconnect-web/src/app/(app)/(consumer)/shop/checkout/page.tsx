"use client";

// /shop/checkout — shipping form, payment placeholder, discount, place order.
//
// Submits to shop_orders + shop_order_items, clears the cart, and routes to
// /shop/order-confirmation/[orderId]. Real payment processing is intentionally
// stubbed — orders enter `pending` status for manual fulfillment.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Loader2, CreditCard, ShoppingBag, Tag, Check,
  AlertTriangle,
} from "lucide-react";
import { useCart, formatCents } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

// ── US states for the shipping select ─────────────────────────────────
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

interface ShippingForm {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
}

const EMPTY_FORM: ShippingForm = {
  firstName: "", lastName: "", address1: "", address2: "",
  city: "", state: "", zip: "", country: "US", phone: "", email: "",
};

type FormErrors = Partial<Record<keyof ShippingForm, string>>;

function validate(form: ShippingForm): FormErrors {
  const errs: FormErrors = {};
  if (form.firstName.trim().length < 1) errs.firstName = "Required";
  if (form.lastName.trim().length < 1) errs.lastName = "Required";
  if (form.address1.trim().length < 5) errs.address1 = "Enter a full street address";
  if (form.city.trim().length < 2) errs.city = "Required";
  if (!form.state) errs.state = "Required";
  if (!/^\d{5}(-\d{4})?$/.test(form.zip.trim())) errs.zip = "Use 5-digit or 9-digit ZIP";
  if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter at least 10 digits";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Enter a valid email";
  return errs;
}

function formatOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `FC-${ymd}-${rand}`;
}

export default function ShopCheckoutPage() {
  const router = useRouter();
  const { items, itemCount, subtotalCents, clearCart, isLoading: cartLoading } = useCart();
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ShippingForm, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Pre-fill email from auth user if available
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user?.email) return;
      setForm(f => (f.email ? f : { ...f, email: user.email! }));
    })();
    return () => { active = false; };
  }, []);

  // Redirect to cart if it's empty (after the loading flicker)
  useEffect(() => {
    if (!cartLoading && items.length === 0 && !isSubmitting) {
      router.replace("/shop/cart");
    }
  }, [cartLoading, items.length, isSubmitting, router]);

  // ── Totals ───────────────────────────────────────────────────────
  const discountCents = useMemo(() => {
    if (appliedDiscount === "GENEX10") return Math.round(subtotalCents * 0.1);
    return 0;
  }, [appliedDiscount, subtotalCents]);

  const shippingCents = 0;
  const taxCents = 0;
  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents + taxCents);
  const hasUnpriced = items.some(i => i.unitPriceCents == null);

  // ── Handlers ─────────────────────────────────────────────────────
  function setField<K extends keyof ShippingForm>(key: K, value: ShippingForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function applyDiscount() {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setDiscountError("Enter a code");
      return;
    }
    if (code === "GENEX10") {
      setAppliedDiscount("GENEX10");
      setDiscountError(null);
    } else {
      setAppliedDiscount(null);
      setDiscountError("Invalid discount code");
    }
  }

  async function handlePlaceOrder() {
    const errs = validate(form);
    setErrors(errs);
    setTouched({
      firstName: true, lastName: true, address1: true, city: true,
      state: true, zip: true, phone: true, email: true,
    });
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubmitError("You need to be signed in to place an order.");
        setIsSubmitting(false);
        return;
      }

      const orderNumber = formatOrderNumber();
      const orderPayload = {
        user_id: user.id,
        order_number: orderNumber,
        status: "pending",
        shipping_first_name: form.firstName.trim(),
        shipping_last_name: form.lastName.trim(),
        shipping_address_line1: form.address1.trim(),
        shipping_address_line2: form.address2.trim() || null,
        shipping_city: form.city.trim(),
        shipping_state: form.state,
        shipping_zip: form.zip.trim(),
        shipping_country: form.country,
        shipping_phone: form.phone.trim(),
        shipping_email: form.email.trim(),
        subtotal_cents: subtotalCents,
        discount_cents: discountCents,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        discount_code: appliedDiscount,
        portal_type: "consumer",
      };

      const { data: order, error: orderErr } = await (supabase as any)
        .from("shop_orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderErr || !order) {
        setSubmitError(orderErr?.message ?? "Could not create order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const lineItems = items.map(it => ({
        order_id: order.id,
        product_slug: it.productSlug,
        product_name: it.productName,
        product_type: it.productType,
        delivery_form: it.deliveryForm,
        quantity: it.quantity,
        unit_price_cents: it.unitPriceCents ?? 0,
        line_total_cents: (it.unitPriceCents ?? 0) * it.quantity,
        metadata: it.metadata,
      }));

      if (lineItems.length > 0) {
        await (supabase as any).from("shop_order_items").insert(lineItems);
      }

      await clearCart();
      router.push(`/shop/order-confirmation/${order.id}`);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Unexpected error placing order.");
      setIsSubmitting(false);
    }
  }

  const liveErrors = touched ? validate(form) : {};
  const isFormValid = Object.keys(liveErrors).length === 0;

  return (
    <div
      className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10"
      style={{ background: "linear-gradient(180deg, #141E33 0%, #1A2744 30%, #1A2744 100%)" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/shop/cart"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to Cart
          </Link>
          <h1 className="text-base md:text-lg font-bold text-white">Checkout</h1>
        </div>

        {cartLoading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form column */}
            <section className="lg:col-span-3 space-y-5">
              {/* Shipping */}
              <Section title="Shipping Info" step={1}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First name" error={touched.firstName ? liveErrors.firstName : undefined}>
                    <Input
                      value={form.firstName}
                      onChange={e => setField("firstName", e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, firstName: true }))}
                      autoComplete="given-name"
                      placeholder="Jane"
                    />
                  </Field>
                  <Field label="Last name" error={touched.lastName ? liveErrors.lastName : undefined}>
                    <Input
                      value={form.lastName}
                      onChange={e => setField("lastName", e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, lastName: true }))}
                      autoComplete="family-name"
                      placeholder="Doe"
                    />
                  </Field>
                </div>

                <Field label="Address line 1" error={touched.address1 ? liveErrors.address1 : undefined}>
                  <Input
                    value={form.address1}
                    onChange={e => setField("address1", e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, address1: true }))}
                    autoComplete="address-line1"
                    placeholder="123 Wellness Way"
                  />
                </Field>

                <Field label="Address line 2 (optional)">
                  <Input
                    value={form.address2}
                    onChange={e => setField("address2", e.target.value)}
                    autoComplete="address-line2"
                    placeholder="Apt, suite, unit"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="City" error={touched.city ? liveErrors.city : undefined}>
                    <Input
                      value={form.city}
                      onChange={e => setField("city", e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, city: true }))}
                      autoComplete="address-level2"
                      placeholder="Austin"
                    />
                  </Field>
                  <Field label="State" error={touched.state ? liveErrors.state : undefined}>
                    <Select
                      value={form.state}
                      onChange={e => setField("state", e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, state: true }))}
                    >
                      <option value="">Select…</option>
                      {US_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="ZIP" error={touched.zip ? liveErrors.zip : undefined}>
                    <Input
                      value={form.zip}
                      onChange={e => setField("zip", e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, zip: true }))}
                      autoComplete="postal-code"
                      placeholder="78701"
                      inputMode="numeric"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Phone" error={touched.phone ? liveErrors.phone : undefined}>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={e => setField("phone", e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                      autoComplete="tel"
                      placeholder="(555) 123-4567"
                    />
                  </Field>
                  <Field label="Email" error={touched.email ? liveErrors.email : undefined}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setField("email", e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))}
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </Field>
                </div>
              </Section>

              {/* Payment placeholder */}
              <Section title="Payment" step={2}>
                <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6 text-center">
                  <CreditCard className="w-8 h-8 text-gray-500 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">Payment processing coming soon.</p>
                  <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto leading-snug">
                    Orders are submitted for manual review and processing. You will receive an email confirmation with payment instructions.
                  </p>
                </div>
              </Section>

              {/* Discount */}
              <Section title="Discount Code">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag
                      className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      strokeWidth={1.5}
                    />
                    <input
                      type="text"
                      value={discountCode}
                      onChange={e => {
                        setDiscountCode(e.target.value);
                        if (discountError) setDiscountError(null);
                      }}
                      placeholder="Enter code"
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:border-[#2DA5A0]/50 focus:ring-1 focus:ring-[#2DA5A0]/30 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyDiscount}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-white border border-white/[0.10] hover:border-white/[0.20] hover:bg-white/[0.05] transition-all"
                  >
                    Apply
                  </button>
                </div>
                {appliedDiscount && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {appliedDiscount} applied — 10% off
                  </p>
                )}
                {discountError && (
                  <p className="text-xs text-red-400 mt-2">{discountError}</p>
                )}
              </Section>

              {submitError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-sm text-red-300">{submitError}</p>
                </div>
              )}

              <motion.button
                type="button"
                onClick={handlePlaceOrder}
                whileHover={isFormValid && !isSubmitting ? { scale: 1.02 } : undefined}
                whileTap={isFormValid && !isSubmitting ? { scale: 0.97 } : undefined}
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-4 rounded-xl font-semibold text-base transition-all duration-200 ${
                  isFormValid && !isSubmitting
                    ? "bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 text-white shadow-lg shadow-[#2DA5A0]/20"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                    Processing…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Place Order
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                )}
              </motion.button>
            </section>

            {/* Sidebar */}
            <aside className="lg:col-span-2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 lg:sticky lg:top-6">
                <h2 className="text-base font-semibold text-white mb-4">Order Summary</h2>

                {items.length === 0 ? (
                  <p className="text-sm text-white/40 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                    No items in cart
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {items.map(it => (
                      <li key={it.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate">
                            {it.productName}
                            <span className="text-white/40 font-normal ml-1">(×{it.quantity})</span>
                          </p>
                          {it.deliveryForm && (
                            <p className="text-[10px] text-white/40">{it.deliveryForm}</p>
                          )}
                        </div>
                        <p className="text-white/80 whitespace-nowrap">
                          {formatCents(
                            it.unitPriceCents != null ? it.unitPriceCents * it.quantity : null,
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="my-4 h-px bg-white/[0.08]" />

                <dl className="space-y-2 text-sm">
                  <Row label={`Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`}>
                    {formatCents(subtotalCents, "—")}
                  </Row>
                  {discountCents > 0 && (
                    <Row label={`Discount (${appliedDiscount})`}>
                      <span className="text-green-400">−{formatCents(discountCents)}</span>
                    </Row>
                  )}
                  <Row label="Shipping">{formatCents(shippingCents)}</Row>
                  <Row label="Tax">{formatCents(taxCents)}</Row>
                </dl>

                <div className="my-4 h-px bg-white/[0.08]" />

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Total</span>
                  <span className="text-lg font-bold text-white">{formatCents(totalCents)}</span>
                </div>

                {hasUnpriced && (
                  <div className="mt-3 rounded-xl border border-[#B75E18]/25 bg-[#B75E18]/8 px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#B75E18] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-[10px] text-[#B75E18]/90 leading-snug">
                      Some items show "Contact for Pricing" — final price confirmed after order review.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Layout primitives ──────────────────────────────────────────────────
function Section({
  title, step, children,
}: { title: string; step?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        {step && (
          <span className="w-5 h-5 rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 text-[10px] text-[#2DA5A0] font-bold flex items-center justify-center">
            {step}
          </span>
        )}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 mb-1.5 block">{label}</span>
      {children}
      {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:border-[#2DA5A0]/50 focus:ring-1 focus:ring-[#2DA5A0]/30 focus:outline-none transition-all ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:border-[#2DA5A0]/50 focus:ring-1 focus:ring-[#2DA5A0]/30 focus:outline-none transition-all appearance-none ${props.className ?? ""}`}
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/60">{label}</dt>
      <dd className="text-white/80">{children}</dd>
    </div>
  );
}

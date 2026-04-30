/**
 * /shop/checkout/success post-payment confirmation page per Prompt #141
 * v3 §5.5 happy path. Stripe redirects users here after successful
 * payment with `?session_id=cs_...`. The server action finalizeShopOrder
 * verifies the session is paid, idempotently creates shop_orders +
 * shop_order_items rows, and clears the server-side cart.
 *
 * Edge cases:
 *   - Missing/invalid session_id -> error message + link back to /shop.
 *   - Payment not yet confirmed (rare race) -> retry-friendly message.
 *   - Order already finalized (refresh) -> idempotent, returns same
 *     order_number.
 *
 * Client cart cleanup happens via a tiny client component that clears
 * localStorage on mount when the server result is ok.
 */
import Link from 'next/link'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { ClientCartReset } from '@/components/shop/ClientCartReset'
import { finalizeShopOrder } from '@/lib/shop/checkout-actions'

interface PageProps {
    searchParams: { session_id?: string }
}

export const metadata = {
    title: 'Order confirmed | Via Cura',
    description: 'Your Via Cura order has been confirmed.',
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
    const sessionId = searchParams.session_id
    const result = sessionId
        ? await finalizeShopOrder(sessionId)
        : { ok: false, error: 'Missing session id.' as string | undefined }

    return (
        <div className="min-h-screen bg-[#0F1A2E] pb-12 text-white">
            <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
                {result.ok ? (
                    <div className="rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/5 p-8 text-center md:p-12">
                        <ClientCartReset />
                        <CheckCircle2 className="mx-auto h-12 w-12 text-[#2DA5A0]" strokeWidth={1.5} />
                        <h1 className="mt-6 text-3xl font-light text-white md:text-4xl">
                            Order confirmed
                        </h1>
                        <p className="mt-3 text-base text-white/70">
                            Thank you. Your order has been placed.
                        </p>
                        {result.orderNumber && (
                            <p className="mt-2 text-sm text-white/55">
                                Order number{' '}
                                <span className="font-medium tracking-wider text-white">
                                    {result.orderNumber}
                                </span>
                            </p>
                        )}
                        <Link
                            href="/shop"
                            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#26918d]"
                        >
                            Continue shopping
                            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center md:p-12">
                        <h1 className="text-2xl font-light text-white md:text-3xl">
                            We could not confirm your order
                        </h1>
                        <p className="mt-3 text-base text-white/65">
                            {result.error ?? 'Please try again or contact support.'}
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link
                                href="/shop/cart"
                                className="rounded-xl border border-white/15 bg-white/[0.02] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
                            >
                                Back to cart
                            </Link>
                            <Link
                                href="/shop"
                                className="rounded-xl bg-[#2DA5A0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#26918d]"
                            >
                                Continue shopping
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

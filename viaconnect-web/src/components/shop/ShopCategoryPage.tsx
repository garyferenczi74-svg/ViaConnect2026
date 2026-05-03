/**
 * Shared template for the seven shop category PLPs per Prompt #141 v3 §5.2.
 * Each route file (e.g., /shop/base-formulations/page.tsx) is a thin wrapper
 * that calls <ShopCategoryPage slug="..." />.
 *
 * Filter chips, interstitial imagery, and the floating sort capsule are
 * deferred to a later phase. This template renders the editorial title +
 * tagline + card grid + empty-state copy used across all seven PLPs.
 *
 * Card variant routing: the cardVariant on the category record decides
 * between Variant A (supplement) and Variant B (testing). genex360 is the
 * only category currently mapped to 'testing'; everything else falls back
 * to 'supplement'.
 *
 * Empty state per spec §7.3: until migration 20260429000000 is applied AND
 * a backfill prompt populates products.category_slug on existing rows, this
 * template renders the graceful empty-state block. No throw, no spinner.
 */
import { Suspense } from 'react'
import { BreadcrumbPills } from '@/components/BreadcrumbPills'
import { CartChrome } from '@/components/shop/CartChrome'
import { PlpProductGrid } from '@/components/shop/PlpProductGrid'
import { FilterSortDrawer } from '@/components/shop/FilterSortDrawer'
import { getShopCategoryBySlug } from '@/lib/shop/categories'
import { getProductsByCategory } from '@/lib/shop/queries'
import { getCurrentShopSession, isConsumerSession } from '@/lib/shop/role'

interface ShopCategoryPageProps {
    slug: string
    hasCaqOnFile?: boolean
}

export async function ShopCategoryPage({ slug, hasCaqOnFile }: ShopCategoryPageProps) {
    const category = getShopCategoryBySlug(slug)
    const [products, session] = await Promise.all([
        getProductsByCategory(slug),
        getCurrentShopSession(),
    ])
    const consumerSession = isConsumerSession(session.role)
    const variant = category?.cardVariant ?? 'supplement'
    const displayName = category?.name ?? slug
    const tagline = category?.tagline ?? ''

    return (
        <div className="min-h-screen bg-[#0F1A2E] pb-24 text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:py-16">
                <BreadcrumbPills
                    className="mb-6"
                    items={[
                        { label: 'Shop', href: '/shop' },
                        { label: displayName, href: `/shop/${slug}` },
                    ]}
                />

                <header className="mb-10 lg:mb-14">
                    <h1 className="text-2xl font-bold text-white">
                        {displayName}
                    </h1>
                    {tagline && (
                        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg lg:text-xl">
                            {tagline}
                        </p>
                    )}
                </header>

                <Suspense>
                    <PlpProductGrid
                        products={products}
                        variant={variant}
                        categorySlug={slug}
                    />
                </Suspense>
            </div>
            <FilterSortDrawer hasCaqOnFile={hasCaqOnFile} />
            <CartChrome consumerSession={consumerSession} userId={session.userId} />
        </div>
    )
}

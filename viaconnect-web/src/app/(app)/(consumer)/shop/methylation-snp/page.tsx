/**
 * /shop/methylation-snp PLP per Prompt #141 v3 §5.2.
 * First wired Variant A (supplement) PLP. Validates the queries to cards
 * pipeline. Filter chips, interstitial imagery, and the floating sort
 * capsule land in Phase E.
 *
 * Empty state: until migration 20260429000000 is applied AND a backfill
 * prompt populates products.category_slug = 'methylation-snp' on existing
 * rows, the query returns an empty array and the empty-state copy renders.
 * This is the spec §7.3 graceful degradation path.
 */
import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/shop/ProductCard'
import { getShopCategoryBySlug } from '@/lib/shop/categories'
import { getProductsByCategory } from '@/lib/shop/queries'

const CATEGORY_SLUG = 'methylation-snp'

export const metadata = {
    title: 'Methylation SNP Support | Via Cura',
    description:
        'Precision formulas targeting MTHFR, COMT, VDR, and 80+ genetic variants. Built for your biology.',
}

export default async function MethylationSnpPlpPage() {
    const category = getShopCategoryBySlug(CATEGORY_SLUG)
    const products = await getProductsByCategory(CATEGORY_SLUG)

    return (
        <div className="min-h-screen bg-[#0F1A2E] text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:py-16">
                <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-white/55">
                    <Link href="/shop" className="hover:text-white/85">
                        Shop
                    </Link>
                    <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
                    <span className="text-white/85">{category?.name ?? 'Methylation SNP Support'}</span>
                </nav>

                <header className="mb-10 lg:mb-14">
                    <h1 className="text-4xl font-light leading-tight text-white md:text-5xl lg:text-6xl">
                        {category?.name ?? 'Methylation SNP Support'}
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg lg:text-xl">
                        {category?.tagline ??
                            'Precision formulas targeting MTHFR, COMT, VDR, and 80+ genetic variants.'}
                    </p>
                </header>

                <Suspense>
                    {products.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center backdrop-blur-sm">
                            <p className="text-base text-white/65">
                                Methylation SNP products are coming online. Check back soon, or browse other
                                categories from{' '}
                                <Link href="/shop" className="text-[#2DA5A0] underline-offset-4 hover:underline">
                                    the shop
                                </Link>
                                .
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8 xl:grid-cols-4">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    variant={category?.cardVariant ?? 'supplement'}
                                    href={`/shop/product/${product.slug ?? product.sku}`}
                                />
                            ))}
                        </div>
                    )}
                </Suspense>
            </div>
        </div>
    )
}

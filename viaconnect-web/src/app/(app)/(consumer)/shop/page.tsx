/**
 * /shop collections landing per Prompt #141 v3 §5.1.
 * Bento grid of the seven canonical Via Cura categories. Methylation SNP
 * Support takes the hero slot (cols 1-6, rows 1-2 at lg) because it is
 * the primary brand differentiator. GeneX360 sits adjacent because the
 * two work as a coupled offer.
 *
 * Peptides are NOT one of the seven categories per spec §1B and do not
 * appear on this landing. The Peptides nav button + destination page
 * remain byte-for-byte unchanged.
 *
 * Server component. Reads categories from Supabase via lib/shop/queries
 * for hero_image_url, falls back to lib/shop/categories.ts (the canonical
 * 7) when the DB row is missing or the table is empty (until migration
 * 20260429000000 is applied + backfilled).
 */
import { Suspense } from 'react'
import { SHOP_CATEGORIES } from '@/lib/shop/categories'
import { getShopCategories } from '@/lib/shop/queries'
import { getCurrentShopSession, isConsumerSession } from '@/lib/shop/role'
import { CartChrome } from '@/components/shop/CartChrome'
import { CollectionTile } from '@/components/shop/CollectionTile'

export const metadata = {
    title: 'Shop | Via Cura',
    description:
        "Precision genomic supplements, methylation SNP support, advanced formulas, women's and children's health, functional mushrooms, and FarmCeutica GeneX360 testing. Built for your biology.",
}

const BENTO_POSITION: Record<string, string> = {
    'methylation-snp': 'lg:col-span-6 lg:row-span-2',
    genex360: 'lg:col-span-3 lg:row-span-1',
    'advanced-formulas': 'lg:col-span-3 lg:row-span-1',
    'base-formulations': 'lg:col-span-3 lg:row-span-1',
    'womens-health': 'lg:col-span-3 lg:row-span-1',
    'childrens-formulations': 'lg:col-span-6 lg:row-span-1',
    'functional-mushrooms': 'lg:col-span-6 lg:row-span-1',
}

const BENTO_ORDER: readonly string[] = [
    'methylation-snp',
    'genex360',
    'advanced-formulas',
    'base-formulations',
    'womens-health',
    'childrens-formulations',
    'functional-mushrooms',
]

export default async function ShopLandingPage() {
    const [dbCategories, session] = await Promise.all([
        getShopCategories(),
        getCurrentShopSession(),
    ])
    const consumerSession = isConsumerSession(session.role)
    const heroBySlug = new Map(dbCategories.map((c) => [c.slug, c.hero_image_url]))
    const videoBySlug = new Map(dbCategories.map((c) => [c.slug, c.video_url]))
    const videoPosterBySlug = new Map(dbCategories.map((c) => [c.slug, c.video_poster_url]))

    const orderedCategories = BENTO_ORDER.map((slug) =>
        SHOP_CATEGORIES.find((c) => c.slug === slug),
    ).filter((c): c is (typeof SHOP_CATEGORIES)[number] => Boolean(c))

    return (
        <div className="min-h-screen bg-[#0F1A2E] text-white">
            <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:py-20">
                <header className="mb-10 lg:mb-16">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#2DA5A0]">
                        Shop
                    </p>
                    <h1 className="mt-3 text-4xl font-light leading-tight text-white md:text-5xl lg:text-6xl">
                        Build For Your Biology
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
                        Precision genomic supplements, methylation SNP support, advanced formulas,
                        functional mushrooms, and FarmCeutica GeneX360 testing. Personalized to your
                        protocol.
                    </p>
                </header>

                <Suspense>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-3 lg:gap-5">
                        {orderedCategories.map((category) => (
                            <CollectionTile
                                key={category.slug}
                                category={category}
                                heroImageUrl={heroBySlug.get(category.slug) ?? null}
                                videoUrl={videoBySlug.get(category.slug) ?? null}
                                videoPosterUrl={videoPosterBySlug.get(category.slug) ?? null}
                                positionClass={BENTO_POSITION[category.slug]}
                            />
                        ))}
                    </div>
                </Suspense>
            </div>
            <CartChrome consumerSession={consumerSession} userId={session.userId} />
        </div>
    )
}

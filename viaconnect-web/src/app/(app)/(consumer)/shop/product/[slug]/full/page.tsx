/**
 * /shop/product/[slug]/full route per Prompt #144 v2 §3.7.
 *
 * Long-form canonical surface for a single product. Both the catalog card
 * Full Description link and the preview PDP Full Description link route
 * here. Renders the long-form description and full ingredient table as
 * full-bleed sections with anchor jump links so deep scroll is navigable.
 *
 * Server component. Fetches via getProductBySlug; 404s on peptide rows
 * or missing slugs. Bento-aware breadcrumb resolves the category name
 * from the canonical SHOP_CATEGORIES list.
 *
 * Mobile sticky cart at bottom. Desktop has no purchase action: the user
 * came here from the catalog card or the preview PDP and can use either
 * surface for cart action. The full card is the SEO surface plus reading
 * surface, not a parallel purchase surface.
 */
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BreadcrumbPills, type BreadcrumbItem } from '@/components/BreadcrumbPills'
import { CartChrome } from '@/components/shop/CartChrome'
import { CategoryFallbackImage } from '@/components/shop/CategoryFallbackImage'
import { FormatIndicator } from '@/components/shop/FormatIndicator'
import { FullCardMobileStickyCart } from '@/components/shop/FullCardMobileStickyCart'
import { getShopCategoryBySlug } from '@/lib/shop/categories'
import { getProductBySlug } from '@/lib/shop/queries'
import { getCurrentShopSession, isConsumerSession } from '@/lib/shop/role'

interface PageProps {
    params: { slug: string }
}

export async function generateMetadata({ params }: PageProps) {
    const product = await getProductBySlug(params.slug)
    if (!product) {
        return { title: 'Product not found | Via Cura' }
    }
    return {
        title: `${product.name} Full Details | Via Cura`,
        description:
            product.description ||
            product.summary ||
            `${product.name} full description and formulation from Via Cura.`,
    }
}

function formatPrice(price: number | null | undefined): string {
    if (price == null) return ''
    return `$${price.toFixed(2)}`
}

export default async function ProductFullCardPage({ params }: PageProps) {
    const [product, session] = await Promise.all([
        getProductBySlug(params.slug),
        getCurrentShopSession(),
    ])
    if (!product) notFound()
    const consumerSession = isConsumerSession(session.role)

    const category = product.category_slug ? getShopCategoryBySlug(product.category_slug) : null
    const variant = category?.cardVariant ?? 'supplement'
    const images =
        (product.image_urls && product.image_urls.length > 0
            ? product.image_urls
            : product.image_url
              ? [product.image_url]
              : []) ?? []
    const primaryImage = images[0] ?? null
    const ingredients = product.ingredients ?? []
    const description = product.description ?? product.summary ?? ''
    const displayPrice = product.price_msrp ?? product.price
    const meta = product.testing_meta ?? {}
    const sections: Array<{ id: string; label: string }> =
        variant === 'supplement'
            ? [
                  { id: 'description', label: 'Description' },
                  { id: 'formulation', label: 'Formulation' },
              ]
            : [
                  { id: 'description', label: 'Overview' },
                  { id: 'whats-tested', label: "What's Tested" },
                  { id: 'who-its-for', label: "Who It's For" },
                  { id: 'what-you-get', label: 'What You Get' },
              ]

    return (
        <div className="min-h-screen bg-[#0F1A2E] pb-24 text-white md:pb-0">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10 lg:py-12">
                <BreadcrumbPills
                    className="mb-6"
                    items={(() => {
                        const items: BreadcrumbItem[] = [{ label: 'Shop', href: '/shop' }]
                        if (category) {
                            items.push({ label: category.name, href: `/shop/${category.slug}` })
                        }
                        items.push({
                            label: product.name,
                            href: `/shop/product/${product.slug ?? params.slug}`,
                        })
                        items.push({
                            label: 'Full Details',
                            href: `/shop/product/${product.slug ?? params.slug}/full`,
                        })
                        return items
                    })()}
                />

                <div className="grid grid-cols-1 gap-8 md:gap-10 lg:grid-cols-12 lg:gap-12">
                    <div className="lg:col-span-5">
                        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white/[0.04] shadow-md">
                            {primaryImage ? (
                                <Image
                                    src={primaryImage}
                                    alt={product.name}
                                    fill
                                    className="object-cover object-top"
                                    sizes="(min-width: 1024px) 40vw, 100vw"
                                    priority
                                />
                            ) : (
                                <CategoryFallbackImage categorySlug={product.category_slug} />
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-6 lg:col-span-7">
                        <div>
                            <h1 className="text-3xl font-light tracking-tight text-white md:text-4xl lg:text-5xl">
                                {product.name}
                            </h1>
                            {variant === 'supplement' && (
                                <FormatIndicator
                                    format={product.format}
                                    className="mt-2 text-base text-white/60"
                                />
                            )}
                            <p className="mt-4 text-3xl font-medium text-white">
                                {formatPrice(displayPrice)}
                            </p>
                        </div>

                        <nav
                            aria-label="Sections"
                            className="flex flex-wrap gap-2 border-t border-white/10 pt-4"
                        >
                            {sections.map((s) => (
                                <a
                                    key={s.id}
                                    href={`#${s.id}`}
                                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70 transition-colors hover:border-[#2DA5A0]/40 hover:text-white"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                </div>

                <section id="description" className="mt-12 scroll-mt-24 md:mt-16">
                    <h2 className="text-2xl font-light tracking-tight text-white md:text-3xl">
                        Description
                    </h2>
                    <div className="mt-4 max-w-3xl text-base leading-relaxed text-white/80 md:text-lg">
                        {description ? (
                            <p>{description}</p>
                        ) : (
                            <p className="text-white/45">Description coming soon.</p>
                        )}
                    </div>
                </section>

                {variant === 'supplement' ? (
                    <section id="formulation" className="mt-12 scroll-mt-24 md:mt-16">
                        <h2 className="text-2xl font-light tracking-tight text-white md:text-3xl">
                            Formulation
                        </h2>
                        {ingredients.length === 0 ? (
                            <p className="mt-4 text-white/45">Formulation details coming soon.</p>
                        ) : (
                            <div className="mt-6 max-w-3xl rounded-2xl border border-white/10 bg-[#1A2744]/40 p-6 backdrop-blur-sm">
                                <ul className="flex flex-col divide-y divide-white/10">
                                    {ingredients.map((ing, idx) => (
                                        <li
                                            key={`${ing.name}-${idx}`}
                                            className="flex items-baseline justify-between gap-3 py-3 text-sm md:text-base"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-white/90">{ing.name}</span>
                                                {ing.role && (
                                                    <span className="text-xs text-white/50">
                                                        {ing.role}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="whitespace-nowrap tabular-nums text-white/60">
                                                {ing.dose != null
                                                    ? `${ing.dose}${ing.unit ?? 'mg'}`
                                                    : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                ) : (
                    <>
                        <section id="whats-tested" className="mt-12 scroll-mt-24 md:mt-16">
                            <h2 className="text-2xl font-light tracking-tight text-white md:text-3xl">
                                What's Tested
                            </h2>
                            <div className="mt-4 max-w-3xl text-base leading-relaxed text-white/80 md:text-lg">
                                {meta.what_is_tested ? (
                                    <p>{meta.what_is_tested}</p>
                                ) : (
                                    <p className="text-white/45">Details coming soon.</p>
                                )}
                            </div>
                        </section>
                        <section id="who-its-for" className="mt-12 scroll-mt-24 md:mt-16">
                            <h2 className="text-2xl font-light tracking-tight text-white md:text-3xl">
                                Who It's For
                            </h2>
                            <div className="mt-4 max-w-3xl text-base leading-relaxed text-white/80 md:text-lg">
                                {meta.who_its_for ? (
                                    <p>{meta.who_its_for}</p>
                                ) : (
                                    <p className="text-white/45">Details coming soon.</p>
                                )}
                            </div>
                        </section>
                        <section id="what-you-get" className="mt-12 scroll-mt-24 md:mt-16">
                            <h2 className="text-2xl font-light tracking-tight text-white md:text-3xl">
                                What You Get
                            </h2>
                            <div className="mt-4 max-w-3xl text-base leading-relaxed text-white/80 md:text-lg">
                                {meta.what_you_get ? (
                                    <p>{meta.what_you_get}</p>
                                ) : (
                                    <p className="text-white/45">Details coming soon.</p>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
            <FullCardMobileStickyCart product={product} variant={variant} />
            <CartChrome consumerSession={consumerSession} userId={session.userId} />
        </div>
    )
}

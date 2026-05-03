/**
 * /shop/product/[slug] product detail page per Prompt #141 v3 §5.3.
 * Two-column desktop (image gallery left, info rail right), single column
 * on mobile. The interactive right rail (tab swap, qty stepper, CTA stubs)
 * lives in PdpRightRail.tsx. The page itself is a server component that
 * fetches the product via the peptide-excluding Phase B query and routes
 * to a 404 if no product matches the slug.
 *
 * Phase E2 scope: data fetch, layout shell, gallery, breadcrumb, right
 * rail wiring. Cart + bundle persistence lands in Phase F. Multi-form
 * delivery selector, full evidence/FAQ tabs, sample-report viewer, and
 * the per-user CAQ-aware genetic match treatment land in later phases.
 */
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BreadcrumbPills, type BreadcrumbItem } from '@/components/BreadcrumbPills'
import { CartChrome } from '@/components/shop/CartChrome'
import { CategoryFallbackImage } from '@/components/shop/CategoryFallbackImage'
import { PdpRightRail } from '@/components/shop/PdpRightRail'
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
        title: `${product.name} | Via Cura`,
        description: product.summary || product.description || `${product.name} from Via Cura.`,
    }
}

export default async function ProductDetailPage({ params }: PageProps) {
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
    const thumbs = images.slice(0, 4)

    return (
        <div className="min-h-screen bg-[#0F1A2E] text-white">
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
                        return items
                    })()}
                />

                <div className="grid grid-cols-1 gap-8 md:gap-10 lg:grid-cols-2 lg:gap-12">
                    <div className="flex flex-col gap-3">
                        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white/[0.04] shadow-md">
                            {primaryImage ? (
                                <Image
                                    src={primaryImage}
                                    alt={product.name}
                                    fill
                                    className="object-cover object-top"
                                    sizes="(min-width: 1024px) 50vw, 100vw"
                                    priority
                                />
                            ) : (
                                <CategoryFallbackImage categorySlug={product.category_slug} />
                            )}
                        </div>
                        {thumbs.length > 1 && (
                            <div className="grid grid-cols-4 gap-2">
                                {thumbs.map((url, i) => (
                                    <div
                                        key={`${url}-${i}`}
                                        className="relative aspect-square overflow-hidden rounded-lg bg-white/[0.04]"
                                    >
                                        <Image
                                            src={url}
                                            alt={`${product.name} view ${i + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="120px"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <PdpRightRail product={product} variant={variant} />
                </div>
            </div>
            <CartChrome consumerSession={consumerSession} userId={session.userId} />
        </div>
    )
}

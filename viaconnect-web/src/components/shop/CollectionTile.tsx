/**
 * CollectionTile renders one of the seven bento tiles on the /shop landing
 * per Prompt #141 v3 §5.1. Each tile shows the category name (display-size),
 * tagline (one line), and background imagery from categories.hero_image_url
 * with a navy gradient mask for legibility. Hover state lifts the tile by
 * -translate-y-1 and increases imagery saturation.
 *
 * If no hero image is set on the category row, the tile renders a teal-to-
 * navy gradient with the category name centered in display type per spec
 * §7.4. The aspect-ratio class comes from the parent grid via positionClass
 * so the bento layout drives sizing, not the tile itself.
 *
 * Per Prompt #143, an optional <CollectionTileVideoLayer> sits behind the
 * static imagery at z-1 when categories.video_url is set. The video layer
 * gracefully renders nothing when:
 *   - video_url is null (legacy state)
 *   - prefers-reduced-motion: reduce
 *   - 2g/3g/slow-2g network or saveData
 * In all these cases the tile renders identically to its pre-#143 form.
 *
 * Z-index layers per #143 §5.2:
 *   z-0: static background image (existing)
 *   z-1: optional video layer (new, only when videoUrl set + budget allows)
 *   z-2: glass overlay gradient
 *   z-3: heading + tagline content
 */
import Image from 'next/image'
import Link from 'next/link'
import type { ShopCategory } from '@/lib/shop/categories'
import { CollectionTileVideoLayer } from '@/components/shop/CollectionTileVideoLayer'

interface CollectionTileProps {
    category: ShopCategory
    heroImageUrl?: string | null
    videoUrl?: string | null
    videoPosterUrl?: string | null
    positionClass?: string
}

export function CollectionTile({
    category,
    heroImageUrl,
    videoUrl,
    videoPosterUrl,
    positionClass,
}: CollectionTileProps) {
    const hasImage = !!heroImageUrl
    return (
        <Link
            href={`/shop/${category.slug}`}
            className={`group relative overflow-hidden rounded-2xl bg-[#1A2744] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(45,165,160,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1A2E] min-h-[220px] lg:min-h-[260px] ${positionClass ?? ''}`}
        >
            <div className="absolute inset-0 z-0">
                {hasImage ? (
                    <Image
                        src={heroImageUrl as string}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover opacity-55 transition-all duration-300 group-hover:opacity-75 group-hover:saturate-150"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2DA5A0]/35 via-[#1A2744] to-[#0F1A2E]" />
                )}
            </div>
            <CollectionTileVideoLayer
                videoUrl={videoUrl}
                posterUrl={videoPosterUrl ?? heroImageUrl}
            />
            <div className="absolute inset-0 z-[2] bg-gradient-to-br from-[#1A2744]/30 via-[#1A2744]/55 to-[#0F1A2E]/90" />
            <div className="relative z-[3] flex h-full flex-col justify-end p-6 lg:p-8">
                <h2 className="text-2xl font-medium tracking-tight text-white lg:text-3xl">
                    {category.name}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70 lg:text-base">
                    {category.tagline}
                </p>
            </div>
        </Link>
    )
}

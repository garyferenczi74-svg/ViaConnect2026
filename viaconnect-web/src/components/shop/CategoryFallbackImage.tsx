/**
 * CategoryFallbackImage renders a category-derived gradient + Lucide glyph
 * when a product has no image_urls per Prompt #141 v3 §4.4. Per-category
 * mapping:
 *   genex360               -> Dna on dark navy gradient
 *   methylation-snp        -> Atom with teal radial accent
 *   functional-mushrooms   -> Leaf on deeper navy gradient
 *   default (other 4 cats) -> Pill on standard navy gradient
 *
 * Console warning for missing imagery is logged at the data layer (the PLP
 * fetcher) so the team can prioritize photography. This component itself is
 * a pure server component with no client logic.
 */
import { Atom, Dna, Leaf, Pill, type LucideIcon } from 'lucide-react'

interface CategoryFallbackImageProps {
    categorySlug: string | null
    className?: string
}

const FALLBACK_BY_CATEGORY: Record<
    string,
    { icon: LucideIcon; gradient: string; accent?: boolean }
> = {
    genex360: {
        icon: Dna,
        gradient: 'from-[#1A2744] to-[#0F1A2E]',
    },
    'methylation-snp': {
        icon: Atom,
        gradient: 'from-[#1A2744] to-[#0F1A2E]',
        accent: true,
    },
    'functional-mushrooms': {
        icon: Leaf,
        gradient: 'from-[#0F1A2E] to-[#070D1A]',
    },
}

const DEFAULT_FALLBACK = {
    icon: Pill,
    gradient: 'from-[#1A2744] to-[#0F1A2E]',
}

export function CategoryFallbackImage({ categorySlug, className }: CategoryFallbackImageProps) {
    const config = (categorySlug && FALLBACK_BY_CATEGORY[categorySlug]) || DEFAULT_FALLBACK
    const Icon = config.icon
    return (
        <div
            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${config.gradient} ${className ?? ''}`}
            aria-hidden="true"
        >
            {('accent' in config && config.accent) && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,165,160,0.18),transparent_60%)]" />
            )}
            <Icon strokeWidth={1.25} className="relative w-12 h-12 text-white/30" />
        </div>
    )
}

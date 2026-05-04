/**
 * Resolves a per-product display_config JSONB into Tailwind classes plus an
 * inline style object for the PLP product card thumbnail per Prompt #149a.
 *
 * The default (empty config) returns no override classes and no style. The
 * caller (ProductCard) treats an absent override as "use existing #149
 * slug-map behavior plus object-cover", so cards that did not get a config
 * row in the data migration render exactly as they did before #149a.
 *
 * When a config IS present:
 *   fit       => Tailwind object-fit class (object-contain or object-cover)
 *   scale     => CSS transform: scale(N), clamped to [0.5, 1.5]
 *   position  => CSS object-position (default "center")
 *   padding   => Tailwind padding bucket (tight, default, loose)
 *
 * For "contain" mode the helper additionally surfaces a bg-white class so the
 * card frame can render a solid white inner panel behind the contained image.
 * Without it, contained source PNGs with white bleed would meet the existing
 * glass card frame at the edges and the seam would read as a dark vignette.
 */

export interface ProductDisplayConfig {
    fit?: 'cover' | 'contain'
    scale?: number
    position?: string
    padding?: 'tight' | 'default' | 'loose'
}

const PADDING_MAP = {
    tight: 'p-1 sm:p-1.5',
    default: 'p-2 sm:p-3',
    loose: 'p-3 sm:p-5',
} as const

const FIT_MAP = {
    contain: 'object-contain',
    cover: 'object-cover',
} as const

export interface ResolvedDisplay {
    paddingClass: string
    fitClass: string
    bgClass: string
    style: { transform?: string; objectPosition?: string }
    hasOverride: boolean
}

const EMPTY: ResolvedDisplay = {
    paddingClass: '',
    fitClass: '',
    bgClass: '',
    style: {},
    hasOverride: false,
}

export function resolveDisplayConfig(
    config: ProductDisplayConfig | null | undefined,
): ResolvedDisplay {
    if (!config || Object.keys(config).length === 0) {
        return EMPTY
    }
    const fit = config.fit === 'cover' ? 'cover' : 'contain'
    const padding =
        config.padding === 'tight' || config.padding === 'loose'
            ? config.padding
            : 'default'
    const scale = clamp(config.scale ?? 1, 0.5, 1.5)
    const position = config.position ?? 'center'
    return {
        paddingClass: PADDING_MAP[padding],
        fitClass: FIT_MAP[fit],
        bgClass: fit === 'contain' ? 'bg-white' : '',
        style: {
            transform: scale === 1 ? undefined : `scale(${scale})`,
            objectPosition: position,
        },
        hasOverride: true,
    }
}

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n))
}

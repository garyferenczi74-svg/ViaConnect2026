/**
 * Shared pill style class strings consumed by both BreadcrumbPills and
 * TabPills per Prompt #148 §F. Single source of truth so the two pill
 * flavors do not drift apart over time.
 *
 * Active pill: brand teal #2DA5A0 border + bg + text + soft glow.
 * Inactive pill: transparent bg + white/15 border + white/80 text + hover
 * preview transitioning to active treatment.
 *
 * Mobile responsive scaling kept separate as pillMobile so callers can
 * compose: combine pillInactive + pillMobile or pillActive + pillMobile.
 * The breadcrumb context uses sm: + max-sm: variants in the original
 * #147 implementation; pillMobile here applies the same compress at
 * the mobile breakpoint via a single class string.
 */

export const pillBase = [
    'inline-flex items-center gap-2',
    'rounded-full',
    'font-medium',
    'backdrop-blur-sm',
].join(' ')

export const pillInactive = [
    pillBase,
    'text-white/80',
    'bg-transparent',
    'border border-white/15',
    'transition-all duration-200 ease-out',
    'hover:text-[#2DA5A0]',
    'hover:border-[#2DA5A0]/50',
    'hover:bg-[#2DA5A0]/5',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-[#2DA5A0]/50',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[#1A2744]',
].join(' ')

export const pillActive = [
    pillBase,
    'text-[#2DA5A0]',
    'bg-[#2DA5A0]/12',
    'border border-[#2DA5A0]',
    'shadow-[0_0_12px_-2px_rgba(45,165,160,0.35)]',
    'cursor-default',
].join(' ')

export const pillSizing = 'sm:px-4 sm:py-1.5 sm:text-sm max-sm:px-3 max-sm:py-1 max-sm:text-xs'

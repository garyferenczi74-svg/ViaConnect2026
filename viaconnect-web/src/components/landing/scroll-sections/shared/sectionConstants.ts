export const SECTION_IDS = {
    features: 'features',
    process: 'process',
    genomics: 'genomics',
    about: 'about',
    finalCta: 'final-cta',
} as const

export const SECTION_ORDER: Array<keyof typeof SECTION_IDS> = [
    'features',
    'process',
    'genomics',
    'about',
    'finalCta',
]

export const NAV_ITEMS = [
    { id: SECTION_IDS.features, label: 'Features' },
    { id: SECTION_IDS.process, label: 'Process' },
    { id: SECTION_IDS.genomics, label: 'Genomics' },
    { id: SECTION_IDS.about, label: 'About' },
] as const

export const TAGLINES = {
    master: 'Built For Your Biology',
    snpSubLine: 'Your Genetics | Your Protocol',
    philosophy: 'Deliver the right bioavailable supplement, to the right person, guided by their genetics.',
} as const

export const COMPLIANCE_COPY = {
    hipaa: 'HIPAA-aware',
} as const

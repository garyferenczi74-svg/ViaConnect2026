import { PILLARS, type PillarData } from '@/components/landing/HeroPillars'

const PROCESS_TIER_COPY = [
    {
        eyebrow: 'Tier 1',
        detail: 'CAQ only',
        headline: 'Baseline protocol',
        body: 'Broad-spectrum nutritional support shaped by your intake questionnaire Addresses commonly under-met nutrient categories and lifestyle-driven gaps',
    },
    {
        eyebrow: 'Tier 2',
        detail: 'CAQ plus labs',
        headline: 'Biomarker-guided protocol',
        body: 'Refines the baseline using your reported lab values Targets nutrient categories where measured biomarkers indicate meaningful depletion or imbalance',
    },
    {
        eyebrow: 'Tier 3',
        detail: 'CAQ plus labs plus genetics',
        headline: 'Genomically integrated protocol',
        body: 'Layers validated gene-to-nutrient pathways onto questionnaire and biomarker context Adjusts for variants influencing absorption, conversion, and cofactor demand',
    },
] as const

/** Same glass chapter card as the hero pillars. Accents follow cards 01, 02, and 03. */
export const PROCESS_TIER_CARDS: PillarData[] = PROCESS_TIER_COPY.map((card, index) => {
    const pillar = PILLARS[index]
    if (!pillar) {
        throw new Error('Process tier cards require the three hero pillar accents')
    }
    return {
        numeral: pillar.numeral,
        eyebrow: card.eyebrow,
        ariaChapter: card.eyebrow,
        headline: card.headline,
        body: card.body,
        detail: card.detail,
        accent: pillar.accent,
        surfaceOverlay: pillar.surfaceOverlay,
    }
})

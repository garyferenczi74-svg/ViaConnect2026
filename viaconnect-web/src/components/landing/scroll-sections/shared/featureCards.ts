import type { LucideIcon } from 'lucide-react'
import {
    Dna,
    Pill,
    ClipboardList,
    Gauge,
    FlaskConical,
    Users,
    Stethoscope,
    Trophy,
} from 'lucide-react'
import { THREE_PORTAL_COPY } from '@/lib/practitioner/waitlist-honesty'

export interface FeatureCard {
    id: string
    icon: LucideIcon
    headline: string
    teaser: string
    body: string
    /** Labeled still Gary can replace one-by-one. Landing coverflow only. */
    placeholderImageSrc?: string
}

export const COVERFLOW_FEATURE_IDS = [
    'genomic-testing',
    'ai-protocols',
    'daily-logging',
    'wellness-analytics',
    'peptide-protocols',
    'three-portal',
    'interaction-engine',
    'helix-rewards',
] as const

export type CoverflowFeatureId = (typeof COVERFLOW_FEATURE_IDS)[number]

export const FEATURE_PLACEHOLDER_IMAGES: Record<CoverflowFeatureId, string> = {
    'genomic-testing': '/images/features/placeholder-precision-genomic-testing.svg',
    'ai-protocols': '/images/features/placeholder-ai-driven-supplement-protocols.svg',
    'daily-logging': '/images/features/placeholder-daily-logging.svg',
    'wellness-analytics': '/images/features/placeholder-wellness-analytics-bos.svg',
    'peptide-protocols': '/images/features/placeholder-peptide-protocols.svg',
    'three-portal': '/images/features/placeholder-three-portal-ecosystem.svg',
    'interaction-engine': '/images/features/placeholder-medical-herbal-interaction-engine.svg',
    'helix-rewards': '/images/features/placeholder-helix-rewards.svg',
}

export const featureCards: FeatureCard[] = [
    {
        id: 'genomic-testing',
        icon: Dna,
        headline: 'Precision Genomic Testing',
        teaser: 'Your DNA decoded into a clear roadmap.',
        body: 'Your DNA, decoded into a roadmap. Six clinical panels translate your genetics into clear actions, not raw data dumps you have to interpret on your own.',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['genomic-testing'],
    },
    {
        id: 'ai-protocols',
        icon: Pill,
        headline: 'AI-Driven Supplement Protocols',
        teaser: 'Right supplement, right delivery, right for you.',
        body: 'Stop guessing what to take. Our AI matches every supplement to your biology and picks the delivery method your body actually absorbs, so the right molecules reach the right targets.',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['ai-protocols'],
    },
    {
        id: 'daily-logging',
        icon: ClipboardList,
        headline: 'Daily Logging',
        teaser: 'Log meals and body changes in seconds.',
        body: 'Log meals, track your body, see the connection. Snap photos for instant macros and micronutrients, track weight, composition, measurements, and progress photos, all plotted against your protocol so you see exactly what is working.',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['daily-logging'],
    },
    {
        id: 'wellness-analytics',
        icon: Gauge,
        headline: 'Wellness Analytics and Bio Optimization Score',
        teaser: "Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN.",
        body: "One score across eight dimensions. Your daily Bio Optimization Score tracks recovery, sleep, strain, and regimen, alongside intelligence across nutrients, symptoms, metabolic, and immune signals. Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN. Five tiers from foundational to optimized.",
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['wellness-analytics'],
    },
    {
        id: 'peptide-protocols',
        icon: FlaskConical,
        headline: 'Peptide Protocols',
        teaser: 'Personalized peptides across four delivery forms.',
        body: 'Peptide therapy, finally personalized. Clinician-developed protocols across liposomal, micellar, injectable, and nasal delivery, matched to your variant profile so the right peptide reaches the right system.',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['peptide-protocols'],
    },
    {
        id: 'three-portal',
        icon: Users,
        headline: THREE_PORTAL_COPY.headline,
        teaser: THREE_PORTAL_COPY.teaser,
        body: THREE_PORTAL_COPY.body,
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['three-portal'],
    },
    {
        id: 'interaction-engine',
        icon: Stethoscope,
        headline: 'Medical and Herbal Interaction Engine',
        teaser: 'Catches what humans miss.',
        body: 'Built to catch what humans miss. Every supplement, peptide, and herb cross-checked against your medications, allergies, and conditions before it reaches your protocol. Practitioner override available when clinical judgment calls for it.',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['interaction-engine'],
    },
    {
        id: 'helix-rewards',
        icon: Trophy,
        headline: 'Helix Rewards',
        teaser: 'Earn, compete, and level up.',
        body: 'Stick with it, get rewarded. Earn points as you log, learn, and progress. Bronze, Silver, Gold, and Platinum tiers turn the daily discipline of your protocol into something worth showing up for.',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['helix-rewards'],
    },
]

export const coverflowFeatureCards: FeatureCard[] = COVERFLOW_FEATURE_IDS.map((id) => {
    const card = featureCards.find((entry) => entry.id === id)
    if (!card) {
        throw new Error(`Coverflow feature card missing: ${id}`)
    }
    return card
})

export function toCoverFlowFeatureItem(card: FeatureCard) {
    return {
        id: card.id,
        title: card.headline,
        description: card.body,
        imageSrc: card.placeholderImageSrc ?? '',
        imageAlt: `PLACEHOLDER — ${card.headline}. Swap this image.`,
    }
}

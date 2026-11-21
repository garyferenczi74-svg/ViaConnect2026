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
    /** Decorative photo drawn under the card gradient. Landing coverflow only. */
    underlayImageSrc?: string
    underlayObjectPosition?: string
    /** Looping decorative clip for the landing coverflow. No audio. */
    videoMp4Src?: string
    videoWebmSrc?: string
    videoPosterSrc?: string
    videoObjectPosition?: string
    /** Portrait clip: below 640px, shrink the cover so the phone stays whole. */
    videoPhoneFrame?: boolean
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
        teaser: 'Your DNA decoded into a clear roadmap',
        body: 'Your DNA, decoded into a roadmap Six clinical panels translate your genetics into clear actions, not raw data dumps you have to interpret on your own',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['genomic-testing'],
        underlayImageSrc: '/images/features/genex360-kit.webp',
        underlayObjectPosition: 'center center',
    },
    {
        id: 'ai-protocols',
        icon: Pill,
        headline: 'AI-Driven Supplement Protocols',
        teaser: 'Right supplement, right delivery, right for you',
        body: 'Stop guessing what to take Our AI matches every supplement to your biology and picks the delivery method your body actually absorbs, so the right molecules reach the right targets',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['ai-protocols'],
    },
    {
        id: 'daily-logging',
        icon: ClipboardList,
        headline: 'Daily Logging',
        teaser: 'Log meals and body changes in seconds',
        body: 'Log meals, track your body, see the connection Snap photos for instant macros and micronutrients, track weight, composition, measurements, and progress photos, all plotted against your protocol so you see exactly what is working',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['daily-logging'],
        videoMp4Src: '/videos/features/daily-logging.mp4',
        videoWebmSrc: '/videos/features/daily-logging.webm',
        videoPosterSrc: '/images/features/daily-logging-poster.webp',
        videoObjectPosition: 'center center',
        videoPhoneFrame: true,
    },
    {
        id: 'wellness-analytics',
        icon: Gauge,
        headline: 'Wellness Analytics and Bio Optimization Score',
        teaser: "Connect a device when it's available Coming soon stays Coming soon Missing stays UNKNOWN",
        body: "One score across eight dimensions Your daily Bio Optimization Score tracks recovery, sleep, strain, and regimen, alongside intelligence across nutrients, symptoms, metabolic, and immune signals Connect a device when it's available Coming soon stays Coming soon Missing stays UNKNOWN Five tiers from foundational to optimized",
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['wellness-analytics'],
        underlayImageSrc: '/images/features/wellness-analytics-bio-score.webp',
        underlayObjectPosition: 'center center',
    },
    {
        id: 'peptide-protocols',
        icon: FlaskConical,
        headline: 'Peptide Education',
        teaser: 'Personalized peptides across four delivery forms',
        body: 'Peptide therapy, finally personalized Clinician-developed protocols across liposomal, micellar, injectable, and nasal delivery, matched to your variant profile so the right peptide reaches the right system',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['peptide-protocols'],
        videoMp4Src: '/videos/features/peptide-education.mp4',
        videoWebmSrc: '/videos/features/peptide-education.webm',
        videoPosterSrc: '/images/features/peptide-education-poster.webp',
        videoObjectPosition: 'center 45%',
    },
    {
        id: 'three-portal',
        icon: Users,
        headline: 'Biology Tracking',
        teaser: THREE_PORTAL_COPY.teaser,
        body: THREE_PORTAL_COPY.body,
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['three-portal'],
    },
    {
        id: 'interaction-engine',
        icon: Stethoscope,
        headline: 'Medical and Herbal Interaction Engine',
        teaser: 'Catches what humans miss',
        body: 'Built to catch what humans miss Every supplement, peptide, and herb cross-checked against your medications, allergies, and conditions before it reaches your protocol Practitioner override available when clinical judgment calls for it',
        placeholderImageSrc: FEATURE_PLACEHOLDER_IMAGES['interaction-engine'],
    },
    {
        id: 'helix-rewards',
        icon: Trophy,
        headline: 'Helix Rewards',
        teaser: 'Earn, compete, and level up',
        body: 'Stick with it, get rewarded Earn points as you log, learn, and progress Bronze, Silver, Gold, and Platinum tiers turn the daily discipline of your protocol into something worth showing up for',
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
    const underlay = card.underlayImageSrc
    return {
        id: card.id,
        title: card.headline,
        description: card.body,
        imageSrc: underlay ?? card.placeholderImageSrc ?? '',
        imageAlt: underlay ? '' : card.headline,
        imageUnderGradient: Boolean(underlay),
        imageObjectPosition: card.underlayObjectPosition,
        videoMp4Src: card.videoMp4Src,
        videoWebmSrc: card.videoWebmSrc,
        videoPosterSrc: card.videoPosterSrc,
        videoObjectPosition: card.videoObjectPosition,
        videoPhoneFrame: card.videoPhoneFrame,
    }
}

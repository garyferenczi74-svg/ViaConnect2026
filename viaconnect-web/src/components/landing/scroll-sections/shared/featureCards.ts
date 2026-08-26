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
}

export const featureCards: FeatureCard[] = [
    {
        id: 'genomic-testing',
        icon: Dna,
        headline: 'Precision Genomic Testing',
        teaser: 'Your DNA decoded into a clear roadmap.',
        body: 'Your DNA, decoded into a roadmap. Six clinical panels translate your genetics into clear actions, not raw data dumps you have to interpret on your own.',
    },
    {
        id: 'ai-protocols',
        icon: Pill,
        headline: 'AI-Driven Supplement Protocols',
        teaser: 'Right supplement, right delivery, right for you.',
        body: 'Stop guessing what to take. Our AI matches every supplement to your biology and picks the delivery method your body actually absorbs, so the right molecules reach the right targets.',
    },
    {
        id: 'daily-logging',
        icon: ClipboardList,
        headline: 'Daily Logging',
        teaser: 'Log meals and body changes in seconds.',
        body: 'Log meals, track your body, see the connection. Snap photos for instant macros and micronutrients, track weight, composition, measurements, and progress photos, all plotted against your protocol so you see exactly what is working.',
    },
    {
        id: 'wellness-analytics',
        icon: Gauge,
        headline: 'Wellness Analytics and Bio Optimization Score',
        teaser: "Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN.",
        body: "One score across eight dimensions. Your daily Bio Optimization Score tracks recovery, sleep, strain, and regimen, alongside intelligence across nutrients, symptoms, metabolic, and immune signals. Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN. Five tiers from foundational to optimized.",
    },
    {
        id: 'peptide-protocols',
        icon: FlaskConical,
        headline: 'Peptide Protocols',
        teaser: 'Personalized peptides across four delivery forms.',
        body: 'Peptide therapy, finally personalized. Clinician-developed protocols across liposomal, micellar, injectable, and nasal delivery, matched to your variant profile so the right peptide reaches the right system.',
    },
    {
        id: 'three-portal',
        icon: Users,
        headline: THREE_PORTAL_COPY.headline,
        teaser: THREE_PORTAL_COPY.teaser,
        body: THREE_PORTAL_COPY.body,
    },
    {
        id: 'interaction-engine',
        icon: Stethoscope,
        headline: 'Medical and Herbal Interaction Engine',
        teaser: 'Catches what humans miss.',
        body: 'Built to catch what humans miss. Every supplement, peptide, and herb cross-checked against your medications, allergies, and conditions before it reaches your protocol. Practitioner override available when clinical judgment calls for it.',
    },
    {
        id: 'helix-rewards',
        icon: Trophy,
        headline: 'Helix Rewards',
        teaser: 'Earn, compete, and level up.',
        body: 'Stick with it, get rewarded. Earn points as you log, learn, and progress. Bronze, Silver, Gold, and Platinum tiers turn the daily discipline of your protocol into something worth showing up for.',
    },
]

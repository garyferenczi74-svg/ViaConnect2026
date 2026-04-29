import type { LucideIcon } from 'lucide-react'
import {
    Dna,
    Pill,
    Apple,
    PersonStanding,
    Gauge,
    Puzzle,
    FlaskConical,
    Users,
    Stethoscope,
    Trophy,
} from 'lucide-react'

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
        id: 'nutrition-log',
        icon: Apple,
        headline: 'Nutrition Log',
        teaser: 'Snap a photo, see every nutrient.',
        body: 'Log meals in seconds, see how every bite lands. Photo capture, AI macro and micronutrient breakdown, all tied back to your protocol so food becomes part of your plan, not a guess.',
    },
    {
        id: 'body-tracker',
        icon: PersonStanding,
        headline: 'Body Tracker',
        teaser: 'Body composition and progress in real numbers.',
        body: 'Watch your body change in real numbers. Weight, composition, measurements, and progress photos in one place, plotted alongside your protocol so you see exactly what is working.',
    },
    {
        id: 'wellness-analytics',
        icon: Gauge,
        headline: 'Wellness Analytics and Bio Optimization Score',
        teaser: 'One daily score across eight health dimensions.',
        body: 'One score, eight dimensions. Your daily Bio Optimization Score tracks recovery, sleep, strain, and regimen, alongside real-time intelligence across nutrients, symptoms, metabolic, and immune signals. Five tiers from foundational to optimized.',
    },
    {
        id: 'plug-ins',
        icon: Puzzle,
        headline: 'Plug-ins',
        teaser: 'Wearables and labs feed your protocol.',
        body: 'Connect everything you already use. Wearables, lab results, pharmacy data, and clinical tools plug straight into your protocol, so every signal you generate sharpens what we recommend.',
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
        headline: 'Three-Portal Ecosystem',
        teaser: 'Share your data with your clinician, your way.',
        body: 'Your data, on your terms. Consumer, Practitioner, and Naturopath portals on one unified model. Share your protocol with your clinician in one tap and message them without leaving the app. Privacy stays role-locked, the conversation stays yours.',
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

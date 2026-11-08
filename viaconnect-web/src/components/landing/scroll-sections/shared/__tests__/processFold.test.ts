import { readFileSync } from 'node:fs'
import {
    PROCESS_STEP_DWELL_MS,
    nextProcessStep,
    shouldRunProcessAutoplay,
} from '@/components/landing/scroll-sections/shared/process-step-cycle'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function src(rel: string): string {
    return readFileSync(path.join(root, rel), 'utf8')
}

const FOLD = src('src/components/landing/scroll-sections/shared/processFoldStyle.tsx')
const DESKTOP = src('src/components/landing/scroll-sections/desktop/ProcessSectionDesktop.tsx')
const TIERS = src('src/components/landing/scroll-sections/shared/processTierCards.ts')
const PILLARS = src('src/components/landing/HeroPillars.tsx')
const STEPS = src('src/components/landing/scroll-sections/shared/ProcessAssessmentSteps.tsx')
const HIGHLIGHT = src('src/components/ui/fluid-hover-highlight.tsx')
const HOOK = src('src/components/ui/use-fluid-hover.ts')
const HERO = src('src/components/landing/HeroSection.tsx')
const FEATURES = src('src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx')
const FEATURES_FOLD = src('src/components/landing/scroll-sections/shared/featuresFoldStyle.tsx')

describe('process fold', () => {
    it('scales the process section from 1000px without restyling hero or features', () => {
        expect(FOLD).toContain('@media (min-width: 1000px)')
        expect(FOLD).toContain('#process')
        expect(FOLD).toContain('scroll-margin-top: var(--landing-nav-h, 78px)')
        expect(FOLD).toContain('--process-gap: clamp(16px, calc(2.2vh + 0.9vw), 40px)')
        expect(FOLD).toContain('--process-circle-label-gap: clamp(10px, 1.4vh, 16px)')
        expect(FOLD).toContain('height: var(--process-gap)')
        expect(FOLD).not.toContain('#features')
        expect(FOLD).not.toContain('hero-')
        expect(HERO).not.toContain('process-heading')
        expect(FEATURES).not.toContain('process-heading')
        expect(FEATURES_FOLD).not.toContain('#process')
        expect(FOLD).not.toMatch(/\bany\b/)
    })

    it('keeps the locked process copy and the features junction padding tokens', () => {
        expect(DESKTOP).toContain('Onboarding Questionnaire')
        expect(DESKTOP).toContain('From your DNA to your daily protocol')
        expect(DESKTOP).toContain('A guided assessment, then your personalized plan Add genetics or labs anytime to deepen the protocol')
        expect(TIERS).toContain('lifestyle-driven gaps')
        expect(TIERS).not.toContain('lifestyle-driven gaps.')
        expect(TIERS).toContain('CAQ only')
        expect(TIERS).toContain('CAQ plus labs plus genetics')
        expect(DESKTOP).toContain('PillarCard')
        expect(PILLARS).toContain('export function PillarCard')
        expect(PILLARS).toContain('clamp(1.75rem, 8vh, 6.875rem)')
        expect(PILLARS).not.toMatch(/detail:\s*'/)
        expect(DESKTOP).toContain('process-note mb-10')
        expect(DESKTOP).not.toContain('rounded-2xl p-6')
        expect(DESKTOP).toContain('pt-8')
        expect(DESKTOP).toContain('md:pt-10')
        expect(DESKTOP).not.toContain('md:pt-32')
        expect(DESKTOP).not.toContain('min-h-screen')
        expect(DESKTOP).toContain('ProcessFoldStyle')
        expect(DESKTOP).toContain('ProcessAssessmentSteps')
        expect(DESKTOP).not.toMatch(/\bany\b/)
    })

    it('lays seven steps on one row from 1000px and a scroll-snap row below', () => {
        for (const label of [
            'Demographics',
            'Health History',
            'Symptoms',
            'Medications and Supplements',
            'Lifestyle',
            'Genetics Upload',
            'Lab Upload',
        ]) {
            expect(STEPS).toContain(label)
        }
        expect(STEPS).not.toContain('Physical')
        expect(STEPS).not.toContain('Neuro')
        expect(STEPS).not.toContain('Emotional')
        expect(STEPS).toContain('Optional')
        expect(STEPS).toContain('strokeWidth={1.5}')
        expect(STEPS).toContain('min-[1000px]:grid-cols-7')
        expect(STEPS).toContain('w-[80%]')
        expect(STEPS).toContain('snap-x')
        expect(STEPS).toContain('snap-mandatory')
        expect(STEPS).toContain('process-dot-')
        expect(STEPS).toContain('ChevronLeft')
        expect(STEPS).toContain('flex-col')
        expect(STEPS).toContain('IntersectionObserver')
        expect(STEPS).toContain('visibilitychange')
        expect(STEPS).toContain('clearTimeout')
        expect(STEPS).toContain("'(prefers-reduced-motion: reduce)'")
        expect(STEPS).not.toContain('FluidHoverHighlight')
        expect(STEPS).toContain('scale-[1.08]')
        expect(STEPS).toContain('data-icon-active')
        expect(STEPS).toContain('group-focus-visible:outline-[#2DA5A0]')
        expect(STEPS).not.toMatch(/\bany\b/)
    })

    it('glides with framer-motion and snaps for reduced motion', () => {
        expect(HIGHLIGHT).toContain("from 'framer-motion'")
        expect(HIGHLIGHT).not.toContain('motion/react')
        expect(HIGHLIGHT).toContain('useReducedMotion')
        expect(HIGHLIGHT).toContain('data-slot="fluid-hover-highlight"')
        expect(HIGHLIGHT).toContain('fluidHighlightTransition')
        expect(HOOK).toContain(':focus-visible')
        expect(HOOK).toContain("event.pointerType === 'touch'")
        expect(HIGHLIGHT).not.toMatch(/\bany\b/)
        expect(HOOK).not.toMatch(/\bany\b/)
    })

    it('cycles one step at a time and pauses off-screen, hidden, or reduced', () => {
        expect(PROCESS_STEP_DWELL_MS).toBeGreaterThanOrEqual(1500)
        expect(PROCESS_STEP_DWELL_MS).toBeLessThanOrEqual(2000)
        expect(nextProcessStep(0, 7)).toBe(1)
        expect(nextProcessStep(6, 7)).toBe(0)
        expect(nextProcessStep(3, 7)).toBe(4)
        const live = { reduceMotion: false, inView: true, tabVisible: true, interacting: false }
        expect(shouldRunProcessAutoplay(live)).toBe(true)
        expect(shouldRunProcessAutoplay({ ...live, reduceMotion: true })).toBe(false)
        expect(shouldRunProcessAutoplay({ ...live, inView: false })).toBe(false)
        expect(shouldRunProcessAutoplay({ ...live, tabVisible: false })).toBe(false)
        expect(shouldRunProcessAutoplay({ ...live, interacting: true })).toBe(false)
    })
})

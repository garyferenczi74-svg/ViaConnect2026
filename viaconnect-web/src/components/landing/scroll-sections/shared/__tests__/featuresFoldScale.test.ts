import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function src(rel: string): string {
    return readFileSync(path.join(root, rel), 'utf8')
}

const FOLD = src('src/components/landing/scroll-sections/shared/featuresFoldStyle.tsx')
const DESKTOP = src('src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx')
const HERO = src('src/components/landing/HeroSection.tsx')
const CAROUSEL = src('src/components/ui/3-d-coverflow-carousel.tsx')

describe('features fold vh scale', () => {
    it('scales heading, subtitle, and plate with vh clamps from 1000px', () => {
        expect(FOLD).toContain('@media (min-width: 1000px)')
        expect(FOLD).toContain('#features')
        expect(FOLD).toContain('clamp(1.5rem, 4.8vh, 2.75rem)')
        expect(FOLD).toContain('clamp(0.875rem, 2.2vh, 1.125rem)')
        expect(FOLD).toContain('clamp(160px, calc(100dvh - 5rem - 230px), 420px)')
        expect(FOLD).toContain('clamp(248px, 28vw, 380px)')
        expect(FOLD).toContain('clamp(13px, 2.4vh, 20px)')
        expect(FOLD).toContain('padding-top: 8px')
        expect(FOLD).toContain('margin-top: auto')
        expect(FOLD).toContain('margin-bottom: auto')
        expect(FOLD).toContain('min-height: calc(100dvh - 5rem - 8px)')
        expect(FOLD).not.toContain('any')
    })

    it('keeps the #295 subtitle-to-card gap and cancels the stage inset only below 1000px', () => {
        expect(DESKTOP).toContain('mb-[clamp(32px,4vw,64px)]')
        expect(DESKTOP).toContain('-mt-[34px] sm:-mt-[40px] md:-mt-[50px]')
        expect(FOLD).toContain('margin-top: auto !important')
        expect(DESKTOP).toContain('FeaturesFoldStyle')
        expect(DESKTOP).not.toContain('min-[1000px]:!pt-24')
    })

    it('does not restyle the hero', () => {
        expect(FOLD).not.toContain('hero-')
        expect(HERO).not.toContain('features-heading')
        expect(HERO).not.toContain('--features-card-h')
        expect(CAROUSEL).toContain('features-card-title')
        expect(CAROUSEL).toContain('strokeWidth={1.5}')
    })
})

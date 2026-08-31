import { createElement } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    COVERFLOW_FEATURE_IDS,
    coverflowFeatureCards,
    FEATURE_PLACEHOLDER_IMAGES,
    featureCards,
    toCoverFlowFeatureItem,
} from '../featureCards';
import {
    coverflowCssTransform,
    coverflowTransform,
    shortestCarouselOffset,
} from '@/components/ui/coverflow-math';
import { CoverFlowCarousel } from '@/components/ui/3-d-coverflow-carousel';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(path.join(root, rel), 'utf8');
}

const CAROUSEL = src('src/components/ui/3-d-coverflow-carousel.tsx');
const MATH = src('src/components/ui/coverflow-math.ts');
const DESKTOP = src('src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx');
const MOBILE = src('src/components/landing/scroll-sections/mobile/FeaturesSectionMobile.tsx');

const LOCKED_HEADLINES = [
    'Precision Genomic Testing',
    'AI-Driven Supplement Protocols',
    'Daily Logging',
    'Wellness Analytics and Bio Optimization Score',
] as const;

const LOCKED_BODIES = [
    'Your DNA, decoded into a roadmap. Six clinical panels translate your genetics into clear actions, not raw data dumps you have to interpret on your own.',
    'Stop guessing what to take. Our AI matches every supplement to your biology and picks the delivery method your body actually absorbs, so the right molecules reach the right targets.',
    'Log meals, track your body, see the connection. Snap photos for instant macros and micronutrients, track weight, composition, measurements, and progress photos, all plotted against your protocol so you see exactly what is working.',
    "One score across eight dimensions. Your daily Bio Optimization Score tracks recovery, sleep, strain, and regimen, alongside intelligence across nutrients, symptoms, metabolic, and immune signals. Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN. Five tiers from foundational to optimized.",
] as const;

describe('landing Features coverflow data', () => {
    it('exposes exactly four coverflow cards with locked Hannah copy', () => {
        expect(COVERFLOW_FEATURE_IDS).toEqual([
            'genomic-testing',
            'ai-protocols',
            'daily-logging',
            'wellness-analytics',
        ]);
        expect(coverflowFeatureCards).toHaveLength(4);
        expect(coverflowFeatureCards.map((card) => card.headline)).toEqual([...LOCKED_HEADLINES]);
        expect(coverflowFeatureCards.map((card) => card.body)).toEqual([...LOCKED_BODIES]);
    });

    it('keeps Three-Portal copy in the catalog without putting it on the carousel', () => {
        expect(featureCards.some((card) => card.id === 'three-portal')).toBe(true);
        expect(coverflowFeatureCards.some((card) => card.id === 'three-portal')).toBe(false);
    });

    it('maps headline to title and body to dropdown description', () => {
        const mapped = coverflowFeatureCards.map(toCoverFlowFeatureItem);
        expect(mapped).toHaveLength(4);
        for (const [index, item] of mapped.entries()) {
            expect(item.title).toBe(LOCKED_HEADLINES[index]);
            expect(item.description).toBe(LOCKED_BODIES[index]);
            expect(item.imageSrc).toBe(FEATURE_PLACEHOLDER_IMAGES[COVERFLOW_FEATURE_IDS[index]]);
            expect(item.imageAlt).toContain('PLACEHOLDER');
            expect(item.imageAlt).toContain(LOCKED_HEADLINES[index]);
        }
    });

    it('ships a labeled placeholder file for each coverflow card', () => {
        for (const id of COVERFLOW_FEATURE_IDS) {
            const rel = FEATURE_PLACEHOLDER_IMAGES[id].replace(/^\//, '');
            const abs = path.join(root, 'public', rel);
            expect(existsSync(abs)).toBe(true);
            const svg = readFileSync(abs, 'utf8');
            expect(svg).toContain('PLACEHOLDER');
            expect(svg).not.toMatch(/unsplash/i);
            expect(svg).not.toMatch(/risotto|wagyu|menu [Dd]ish/i);
        }
    });
});

describe('coverflow math', () => {
    it('wraps the shortest offset around a four-card rack', () => {
        expect(shortestCarouselOffset(0, 0, 4)).toBe(0);
        expect(shortestCarouselOffset(1, 0, 4)).toBe(1);
        expect(shortestCarouselOffset(3, 0, 4)).toBe(-1);
        expect(shortestCarouselOffset(0, 1, 4)).toBe(-1);
    });

    it('faces the active card forward and folds neighbors in 3D', () => {
        const center = coverflowTransform(0, false);
        const right = coverflowTransform(1, false);
        const left = coverflowTransform(-1, false);
        expect(center.rotateY).toBe(0);
        expect(center.scale).toBe(1);
        expect(right.rotateY).toBeLessThan(0);
        expect(left.rotateY).toBeGreaterThan(0);
        expect(coverflowCssTransform(center)).toContain('rotateY(0deg)');
    });

    it('hides neighbors when reduced motion is on', () => {
        const neighbor = coverflowTransform(1, true);
        expect(neighbor.opacity).toBe(0);
        expect(neighbor.rotateY).toBe(0);
    });
});

describe('CoverFlowCarousel Features integration', () => {
    it('is transparent and has no restaurant demo chrome', () => {
        expect(CAROUSEL).toContain('bg-transparent');
        expect(CAROUSEL).not.toContain('#0c0a09');
        expect(CAROUSEL).not.toMatch(/View Menu/);
        expect(CAROUSEL).not.toMatch(/unsplash/i);
        expect(CAROUSEL).not.toMatch(/Truffle|Wagyu|Risotto|Branzino/i);
        expect(MATH).not.toContain('#0c0a09');
        expect(DESKTOP).not.toContain('#0c0a09');
        expect(MOBILE).not.toContain('#0c0a09');
    });

    it('uses Lucide chevrons at stroke 1.5 and no feature icons', () => {
        expect(CAROUSEL).toContain('ChevronLeft');
        expect(CAROUSEL).toContain('ChevronRight');
        expect(CAROUSEL).toContain('ChevronDown');
        expect(CAROUSEL).toMatch(/strokeWidth=\{1\.5\}/);
        expect(DESKTOP).not.toContain('card.icon');
        expect(MOBILE).not.toContain('feature.icon');
        expect(DESKTOP).not.toMatch(/<Icon/);
        expect(MOBILE).not.toMatch(/<Icon/);
    });

    it('keeps descriptions in a collapsed dropdown', () => {
        expect(CAROUSEL).toContain('aria-expanded');
        expect(CAROUSEL).toContain('item.description');
        expect(CAROUSEL).toContain('openId === item.id');
        expect(DESKTOP).toContain('card.body');
        expect(MOBILE).toContain('feature.body');
    });

    it('SSR-renders four headings and keeps descriptions collapsed', () => {
        const html = renderToStaticMarkup(
            createElement(CoverFlowCarousel, {
                items: coverflowFeatureCards.map(toCoverFlowFeatureItem),
            }),
        );
        for (const headline of LOCKED_HEADLINES) {
            expect(html).toContain(headline);
        }
        for (const body of LOCKED_BODIES) {
            expect(html).not.toContain(body);
        }
        expect(html).not.toContain('View Menu');
        expect(html).not.toContain('#0c0a09');
        expect(html).toContain('features-coverflow');
        expect(html).toContain('PLACEHOLDER');
    });
});

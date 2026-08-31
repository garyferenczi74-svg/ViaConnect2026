import { createElement } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { THREE_PORTAL_COPY } from '@/lib/practitioner/waitlist-honesty';
import {
    COVERFLOW_FEATURE_IDS,
    coverflowFeatureCards,
    FEATURE_PLACEHOLDER_IMAGES,
    featureCards,
    toCoverFlowFeatureItem,
} from '../featureCards';
import {
    COVERFLOW_AUTOPLAY_DWELL_MS,
    coverflowCssTransform,
    coverflowTransform,
    nextClockwiseIndex,
    shouldPauseCoverflowAutoplay,
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
    'Peptide Protocols',
    THREE_PORTAL_COPY.headline,
    'Medical and Herbal Interaction Engine',
    'Helix Rewards',
] as const;

const LOCKED_BODIES = [
    'Your DNA, decoded into a roadmap. Six clinical panels translate your genetics into clear actions, not raw data dumps you have to interpret on your own.',
    'Stop guessing what to take. Our AI matches every supplement to your biology and picks the delivery method your body actually absorbs, so the right molecules reach the right targets.',
    'Log meals, track your body, see the connection. Snap photos for instant macros and micronutrients, track weight, composition, measurements, and progress photos, all plotted against your protocol so you see exactly what is working.',
    "One score across eight dimensions. Your daily Bio Optimization Score tracks recovery, sleep, strain, and regimen, alongside intelligence across nutrients, symptoms, metabolic, and immune signals. Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN. Five tiers from foundational to optimized.",
    'Peptide therapy, finally personalized. Clinician-developed protocols across liposomal, micellar, injectable, and nasal delivery, matched to your variant profile so the right peptide reaches the right system.',
    THREE_PORTAL_COPY.body,
    'Built to catch what humans miss. Every supplement, peptide, and herb cross-checked against your medications, allergies, and conditions before it reaches your protocol. Practitioner override available when clinical judgment calls for it.',
    'Stick with it, get rewarded. Earn points as you log, learn, and progress. Bronze, Silver, Gold, and Platinum tiers turn the daily discipline of your protocol into something worth showing up for.',
] as const;

describe('landing Features coverflow data', () => {
    it('exposes exactly eight coverflow cards with locked Hannah copy', () => {
        expect(COVERFLOW_FEATURE_IDS).toEqual([
            'genomic-testing',
            'ai-protocols',
            'daily-logging',
            'wellness-analytics',
            'peptide-protocols',
            'three-portal',
            'interaction-engine',
            'helix-rewards',
        ]);
        expect(coverflowFeatureCards).toHaveLength(8);
        expect(coverflowFeatureCards.map((card) => card.id)).toEqual([...COVERFLOW_FEATURE_IDS]);
        expect(coverflowFeatureCards.map((card) => card.headline)).toEqual([...LOCKED_HEADLINES]);
        expect(coverflowFeatureCards.map((card) => card.body)).toEqual([...LOCKED_BODIES]);
        expect(featureCards.map((card) => card.id)).toEqual([...COVERFLOW_FEATURE_IDS]);
    });

    it('keeps waitlist-honest Three-Portal copy on the carousel', () => {
        const threePortal = coverflowFeatureCards.find((card) => card.id === 'three-portal');
        expect(threePortal?.headline).toBe(THREE_PORTAL_COPY.headline);
        expect(threePortal?.teaser).toBe(THREE_PORTAL_COPY.teaser);
        expect(threePortal?.body).toBe(THREE_PORTAL_COPY.body);
        expect(threePortal?.body).toMatch(/Q1 2027/);
        expect(threePortal?.body.toLowerCase()).not.toMatch(/in one tap/);
    });

    it('maps headline to title and body to dropdown description', () => {
        const mapped = coverflowFeatureCards.map(toCoverFlowFeatureItem);
        expect(mapped).toHaveLength(8);
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
            expect(svg).not.toMatch(/unsplash\.com/i);
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

    it('advances clockwise through production order and loops', () => {
        const ids = [...COVERFLOW_FEATURE_IDS];
        let index = 0;
        const walked = [ids[index]];
        for (let step = 0; step < ids.length; step += 1) {
            index = nextClockwiseIndex(index, ids.length);
            walked.push(ids[index]);
        }
        expect(walked).toEqual([
            'genomic-testing',
            'ai-protocols',
            'daily-logging',
            'wellness-analytics',
            'peptide-protocols',
            'three-portal',
            'interaction-engine',
            'helix-rewards',
            'genomic-testing',
        ]);
        expect(nextClockwiseIndex(7, 8)).toBe(0);
    });

    it('pauses autoplay on hover, focus, touch, dropdown, and reduced motion', () => {
        const idle = {
            reduceMotion: false,
            hovering: false,
            focusWithin: false,
            pointerActive: false,
            dropdownOpen: false,
        };
        expect(shouldPauseCoverflowAutoplay(idle)).toBe(false);
        expect(shouldPauseCoverflowAutoplay({ ...idle, hovering: true })).toBe(true);
        expect(shouldPauseCoverflowAutoplay({ ...idle, focusWithin: true })).toBe(true);
        expect(shouldPauseCoverflowAutoplay({ ...idle, pointerActive: true })).toBe(true);
        expect(shouldPauseCoverflowAutoplay({ ...idle, dropdownOpen: true })).toBe(true);
        expect(shouldPauseCoverflowAutoplay({ ...idle, reduceMotion: true })).toBe(true);
        expect(shouldPauseCoverflowAutoplay({ ...idle, reduceMotion: null })).toBe(true);
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

    it('dwells 2000ms then steps clockwise, and does not auto-rotate under reduced motion', () => {
        expect(COVERFLOW_AUTOPLAY_DWELL_MS).toBe(2000);
        expect(CAROUSEL).toContain('COVERFLOW_AUTOPLAY_DWELL_MS');
        expect(CAROUSEL).toContain('nextClockwiseIndex');
        expect(CAROUSEL).toContain('shouldPauseCoverflowAutoplay');
        expect(CAROUSEL).toContain('setTimeout');
        expect(CAROUSEL).toContain("pointerType === 'mouse'");
        expect(CAROUSEL).toContain('setHovering(true)');
        expect(CAROUSEL).toContain('onFocusCapture');
        expect(CAROUSEL).toContain('onPointerDown');
        expect(CAROUSEL).toContain('dropdownOpen: openId !== null');
        expect(CAROUSEL).toContain('reduceMotion !== false');
        expect(CAROUSEL).toContain('data-autoplay');
        expect(CAROUSEL).not.toMatch(/transition:\s*[^;]*2000/);
        expect(CAROUSEL).toMatch(/transform 0\.45s/);
    });

    it('SSR-renders eight headings and keeps descriptions collapsed', () => {
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

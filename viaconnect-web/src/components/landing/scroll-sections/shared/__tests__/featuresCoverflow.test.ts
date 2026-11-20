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
    COVERFLOW_AUTOPLAY_MS_PER_CARD,
    COVERFLOW_CARD_SIZE_CLASS,
    COVERFLOW_STAGE_HEIGHT_CLASS,
    COVERFLOW_STEP_MS,
    advanceCoverflowProgress,
    coverflowCssTransform,
    coverflowDisplayedProgress,
    coverflowHoldMs,
    coverflowProgressIsSettled,
    coverflowStepProgress,
    coverflowTransform,
    nearestCoverflowIndex,
    nextClockwiseIndex,
    releaseCoverflowInteraction,
    shouldPauseCoverflowAutoplay,
    shortestCarouselOffset,
    wrapCarouselProgress,
} from '@/components/ui/coverflow-math';
import { CoverFlowCarousel } from '@/components/ui/3-d-coverflow-carousel';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(path.join(root, rel), 'utf8');
}

const CAROUSEL = src('src/components/ui/3-d-coverflow-carousel.tsx');
const MATH = src('src/components/ui/coverflow-math.ts');
const DESKTOP = src('src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx');
const PROCESS_DESKTOP = src(
    'src/components/landing/scroll-sections/desktop/ProcessSectionDesktop.tsx',
);
const MOBILE = src('src/components/landing/scroll-sections/mobile/FeaturesSectionMobile.tsx');

const LOCKED_HEADLINES = [
    'Precision Genomic Testing',
    'AI-Driven Supplement Protocols',
    'Daily Logging',
    'Wellness Analytics and Bio Optimization Score',
    'Peptide Education',
    THREE_PORTAL_COPY.headline,
    'Medical and Herbal Interaction Engine',
    'Helix Rewards',
] as const;

const LOCKED_BODIES = [
    'Your DNA, decoded into a roadmap Six clinical panels translate your genetics into clear actions, not raw data dumps you have to interpret on your own',
    'Stop guessing what to take Our AI matches every supplement to your biology and picks the delivery method your body actually absorbs, so the right molecules reach the right targets',
    'Log meals, track your body, see the connection Snap photos for instant macros and micronutrients, track weight, composition, measurements, and progress photos, all plotted against your protocol so you see exactly what is working',
    "One score across eight dimensions Your daily Bio Optimization Score tracks recovery, sleep, strain, and regimen, alongside intelligence across nutrients, symptoms, metabolic, and immune signals Connect a device when it's available Coming soon stays Coming soon Missing stays UNKNOWN Five tiers from foundational to optimized",
    'Peptide therapy, finally personalized Clinician-developed protocols across liposomal, micellar, injectable, and nasal delivery, matched to your variant profile so the right peptide reaches the right system',
    THREE_PORTAL_COPY.body,
    'Built to catch what humans miss Every supplement, peptide, and herb cross-checked against your medications, allergies, and conditions before it reaches your protocol Practitioner override available when clinical judgment calls for it',
    'Stick with it, get rewarded Earn points as you log, learn, and progress Bronze, Silver, Gold, and Platinum tiers turn the daily discipline of your protocol into something worth showing up for',
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
            if (item.id === 'wellness-analytics') {
                expect(item.imageSrc).toBe('/images/features/wellness-analytics-bio-score.webp');
                expect(item.imageAlt).toBe('');
                expect(item.imageUnderGradient).toBe(true);
                expect(item.imageObjectPosition).toBe('center center');
            } else {
                expect(item.imageSrc).toBe(FEATURE_PLACEHOLDER_IMAGES[COVERFLOW_FEATURE_IDS[index]]);
                expect(item.imageAlt).toBe(LOCKED_HEADLINES[index]);
                expect(item.imageUnderGradient).toBe(false);
            }
            expect(item.imageAlt).not.toMatch(/PLACEHOLDER/i);
        }
    });

    it('ships a labeled placeholder file for each coverflow card', () => {
        for (const id of COVERFLOW_FEATURE_IDS) {
            const rel = FEATURE_PLACEHOLDER_IMAGES[id].replace(/^\//, '');
            const abs = path.join(root, 'public', rel);
            expect(existsSync(abs)).toBe(true);
            const bytes = readFileSync(abs);
            const svg = bytes.toString('utf8');
            expect(svg).not.toMatch(/PLACEHOLDER/);
            if (id === 'peptide-protocols') {
                expect(svg).toContain('<title id="title">Peptide Education</title>');
                expect(svg).toContain('>Peptide Education</text>');
                expect(svg).not.toContain('Peptide Protocols');
            }
            expect(svg).not.toMatch(/Swap this file/i);
            expect(svg).not.toMatch(/unsplash\.com/i);
            expect(svg).not.toMatch(/risotto|wagyu|menu [Dd]ish/i);
            expect(svg).not.toMatch(/[\u2013\u2014]/);
            expect(bytes.includes(0x14)).toBe(false);
            for (const byte of bytes) {
                const control = byte < 32 && byte !== 9 && byte !== 10 && byte !== 13;
                expect(control).toBe(false);
            }
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

    it('interpolates fractional offsets so autoplay can glide without a snap', () => {
        const halfway = coverflowTransform(0.5, false);
        const center = coverflowTransform(0, false);
        const right = coverflowTransform(1, false);
        expect(halfway.rotateY).toBe(-21);
        expect(halfway.translateXPercent).toBe(28);
        expect(halfway.opacity).toBeGreaterThan(right.opacity);
        expect(halfway.opacity).toBeLessThan(center.opacity);
        expect(shortestCarouselOffset(1, 0.5, 8)).toBe(0.5);
        expect(shortestCarouselOffset(0, 0.5, 8)).toBe(-0.5);
        expect(nearestCoverflowIndex(7.6, 8)).toBe(0);
        expect(wrapCarouselProgress(-0.25, 8)).toBe(7.75);
    });

    it('advances progress continuously and wraps the eight-card loop', () => {
        expect(COVERFLOW_AUTOPLAY_MS_PER_CARD).toBe(2800);
        expect(COVERFLOW_AUTOPLAY_MS_PER_CARD).toBeLessThan(6000);
        expect(advanceCoverflowProgress(0, 2800, 2800, 8)).toBe(1);
        expect(advanceCoverflowProgress(7.5, 1400, 2800, 8)).toBe(0);
        expect(advanceCoverflowProgress(0, 700, 2800, 8)).toBeCloseTo(0.25);
        expect(advanceCoverflowProgress(3, 0, 2800, 8)).toBe(3);
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
        expect(shouldPauseCoverflowAutoplay({ ...idle, inView: false })).toBe(true);
        expect(shouldPauseCoverflowAutoplay({ ...idle, tabVisible: false })).toBe(true);
        expect(shouldPauseCoverflowAutoplay({ ...idle, inView: true, tabVisible: true })).toBe(false);
    });

    it('finishes a step on a card instead of parking between cards', () => {
        expect(coverflowHoldMs()).toBe(COVERFLOW_AUTOPLAY_MS_PER_CARD - COVERFLOW_STEP_MS);
        expect(COVERFLOW_STEP_MS).toBeLessThan(900);
        expect(coverflowStepProgress(0, COVERFLOW_STEP_MS)).toBe(0);
        expect(coverflowStepProgress(COVERFLOW_STEP_MS, COVERFLOW_STEP_MS)).toBe(1);

        let progress = 2.42;
        const target = nearestCoverflowIndex(progress, 8);
        expect(coverflowProgressIsSettled(progress)).toBe(false);
        for (let elapsed = 16; elapsed <= COVERFLOW_STEP_MS + 32; elapsed += 16) {
            const amount = coverflowStepProgress(elapsed, COVERFLOW_STEP_MS);
            progress = coverflowDisplayedProgress(2.42, target, amount, 8);
            if (amount >= 1) break;
        }
        expect(coverflowProgressIsSettled(progress)).toBe(true);
        expect(nearestCoverflowIndex(progress, 8)).toBe(target);
        expect(progress).not.toBeCloseTo(2.42, 1);
    });

    it('drops a stuck hover or pointer when the tab hides or the rack scrolls away', () => {
        const stuck = { hovering: true, focusWithin: true, pointerActive: true };
        const hidden = releaseCoverflowInteraction(stuck, 'visibility-hidden');
        expect(hidden.hovering).toBe(false);
        expect(hidden.pointerActive).toBe(false);
        expect(hidden.focusWithin).toBe(true);
        const away = releaseCoverflowInteraction(
            { hovering: true, focusWithin: false, pointerActive: true },
            'left-viewport',
        );
        expect(
            shouldPauseCoverflowAutoplay({
                reduceMotion: false,
                hovering: away.hovering,
                focusWithin: away.focusWithin,
                pointerActive: away.pointerActive,
                dropdownOpen: false,
                inView: true,
                tabVisible: true,
            }),
        ).toBe(false);
        expect(releaseCoverflowInteraction(stuck, 'pointer-up').pointerActive).toBe(false);
        expect(releaseCoverflowInteraction(stuck, 'pointer-up').hovering).toBe(true);
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
        expect(CAROUSEL).not.toContain('ChevronLeft');
        expect(CAROUSEL).not.toContain('ChevronRight');
        expect(CAROUSEL).not.toContain('features-coverflow-controls');
        expect(CAROUSEL).not.toContain('Previous feature');
        expect(CAROUSEL).toContain('aria-live="polite"');
        expect(CAROUSEL).toContain('aria-label="ViaConnect features"');
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

    it('steps between settled cards with rAF and does not freeze mid-transition', () => {
        expect(COVERFLOW_AUTOPLAY_MS_PER_CARD).toBe(2800);
        expect(COVERFLOW_AUTOPLAY_MS_PER_CARD).toBeLessThan(6000);
        expect(CAROUSEL).toContain('COVERFLOW_AUTOPLAY_MS_PER_CARD');
        expect(CAROUSEL).toContain('coverflowStepProgress');
        expect(CAROUSEL).toContain('coverflowDisplayedProgress');
        expect(CAROUSEL).toContain('finishStepNow');
        expect(CAROUSEL).toContain('visibilitychange');
        expect(CAROUSEL).toContain('IntersectionObserver');
        expect(CAROUSEL).toContain(":focus-visible");
        expect(CAROUSEL).toContain('requestAnimationFrame');
        expect(CAROUSEL).toContain('cancelAnimationFrame');
        expect(CAROUSEL).not.toContain('COVERFLOW_AUTOPLAY_DWELL_MS');
        expect(CAROUSEL).not.toContain('setTimeout');
        expect(CAROUSEL).not.toContain('will-change-transform');
        expect(CAROUSEL).not.toContain('transform 0.35s');
        expect(MATH).not.toContain('COVERFLOW_AUTOPLAY_DWELL_MS');
        expect(MATH).not.toMatch(/2000/);
        expect(CAROUSEL).toContain('nextClockwiseIndex');
        expect(CAROUSEL).toContain('shouldPauseCoverflowAutoplay');
        expect(CAROUSEL).toContain("pointerType === 'mouse'");
        expect(CAROUSEL).toContain('setHovering(true)');
        expect(CAROUSEL).toContain('onFocusCapture');
        expect(CAROUSEL).toContain('onPointerDown');
        expect(CAROUSEL).toContain('dropdownOpen: openId !== null');
        expect(CAROUSEL).toContain('prefersReducedMotion !== false');
        expect(CAROUSEL).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
        expect(CAROUSEL).toContain('useState<boolean | null>(\n        null,');
        expect(CAROUSEL).not.toContain("typeof window === 'undefined'");
        expect(CAROUSEL).toContain('data-autoplay');
        expect(CAROUSEL).toContain('data-motion');
        expect(CAROUSEL).toContain('data-motion-pref');
        expect(CAROUSEL).toContain('dataset.settled');
        expect(CAROUSEL).toContain('dataset.phase');
        expect(CAROUSEL).not.toMatch(/transform 0\.45s/);
        expect(CAROUSEL).not.toContain('useReducedMotion');
    });

    it('keeps the compact 390 plate and enlarges tablet plus desktop', () => {
        expect(COVERFLOW_STAGE_HEIGHT_CLASS).toContain('h-[288px]');
        expect(COVERFLOW_STAGE_HEIGHT_CLASS).toContain('sm:h-[420px]');
        expect(COVERFLOW_STAGE_HEIGHT_CLASS).toContain('md:h-[540px]');
        expect(COVERFLOW_STAGE_HEIGHT_CLASS).toContain('lg:h-[620px]');
        expect(COVERFLOW_STAGE_HEIGHT_CLASS).not.toMatch(/(?:^|[\s"'])h-\[420px\]/);
        expect(COVERFLOW_STAGE_HEIGHT_CLASS).not.toContain('md:h-[340px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('w-[196px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('h-[220px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('sm:w-[268px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('sm:h-[340px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('md:w-[360px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('md:h-[440px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('lg:w-[420px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).toContain('lg:h-[520px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).not.toContain('md:w-[248px]');
        expect(COVERFLOW_CARD_SIZE_CLASS).not.toContain('md:h-[268px]');
        expect(CAROUSEL).toContain('COVERFLOW_STAGE_HEIGHT_CLASS');
        expect(CAROUSEL).toContain('COVERFLOW_CARD_SIZE_CLASS');
        expect(CAROUSEL).not.toContain('mt-1.5');
        expect(CAROUSEL).not.toContain('features-coverflow-controls');
        expect(CAROUSEL).not.toContain('mt-4 flex items-center');
        expect(CAROUSEL).not.toContain('h-[420px]');
        expect(CAROUSEL).not.toContain('md:h-[500px]');
        expect(CAROUSEL).not.toContain('md:h-[340px]');
        expect(CAROUSEL).not.toContain('md:h-[268px]');
        expect(DESKTOP).toContain('CoverFlowCarousel');
        expect(MOBILE).toContain('CoverFlowCarousel');
    });

    it('keeps Features→Onboarding junction tight (40–72px) without min-h-screen', () => {
        expect(DESKTOP).not.toContain('min-h-screen');
        expect(DESKTOP).toContain('px-5');
        expect(DESKTOP).toContain('md:px-12');
        expect(DESKTOP).toContain('pt-20');
        expect(DESKTOP).toContain('pb-6');
        expect(DESKTOP).toContain('md:pt-32');
        expect(DESKTOP).toContain('md:pb-8');
        expect(DESKTOP).not.toContain('md:pb-16');
        expect(PROCESS_DESKTOP).not.toContain('min-h-screen');
        expect(PROCESS_DESKTOP).toContain('pt-8');
        expect(PROCESS_DESKTOP).toContain('md:pt-10');
        expect(PROCESS_DESKTOP).not.toContain('md:pt-32');
        expect(PROCESS_DESKTOP).toContain('Onboarding Questionnaire');
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
        expect(html).not.toContain('PLACEHOLDER');
        expect(html).toContain('features-coverflow-underlay-wellness-analytics');
        expect(html).toContain('features-coverflow-orbs-wellness-analytics');
        expect(html).not.toContain('features-coverflow-underlay-daily-logging');
        expect(html).not.toContain('features-coverflow-orbs-daily-logging');
        expect(html).not.toContain('features-coverflow-underlay-genomic-testing');
        expect(html).toContain('wellness-analytics-bio-score.webp');
        expect(html).not.toContain('daily-logging-bio-score.webp');
        expect(html).toContain('alt="Precision Genomic Testing"');
        expect(html).toContain('alt="Daily Logging"');
        expect(html).not.toContain('alt="Wellness Analytics and Bio Optimization Score"');
        expect(html).toContain('rgba(26,39,68,0.34)');
        expect(html).toContain('background-size:contain');
        const photo = readFileSync(path.join(root, 'public/images/features/wellness-analytics-bio-score.webp'));
        expect(photo.subarray(0, 4).toString('ascii')).toBe('RIFF');
        expect(photo.subarray(8, 12).toString('ascii')).toBe('WEBP');
        expect(photo.length).toBeGreaterThan(8_000);
        expect(photo.length).toBeLessThan(120_000);
    });

    it('keeps the Wellness Analytics photo behind that card gradient only', () => {
        expect(CAROUSEL).toContain('imageUnderGradient');
        expect(CAROUSEL).toContain('bg-contain bg-no-repeat');
        expect(CAROUSEL).not.toContain('bg-cover');
        expect(CAROUSEL).toContain("backgroundSize: 'contain'");
        expect(CAROUSEL).toContain('from-[#1A2744] via-[#224852] to-[#111827]');
        expect(CAROUSEL).toContain('rgba(26,39,68,0.34)');
        expect(CAROUSEL).toContain('rgba(34,72,82,0.28)');
        expect(CAROUSEL).toContain('rgba(17,24,39,0.42)');
        expect(CAROUSEL).toContain('features-coverflow-orbs-');
        expect(CAROUSEL).toContain('fill="#2DA5A0"');
        expect(CAROUSEL).toContain('fill="#76866F"');
        expect(CAROUSEL).toContain('fill="#06B6D4"');
        expect(CAROUSEL).toContain('feGaussianBlur');
        expect(CAROUSEL).toContain('max-sm:pb-3');
        expect(DESKTOP).toContain('card.underlayImageSrc');
        expect(DESKTOP).toContain('imageUnderGradient');
        expect(MOBILE).toContain('feature.underlayImageSrc');
        expect(MOBILE).toContain('imageUnderGradient');
        const withPhoto = coverflowFeatureCards.filter((card) => card.underlayImageSrc);
        expect(withPhoto.map((card) => card.id)).toEqual(['wellness-analytics']);
        const daily = coverflowFeatureCards.find((card) => card.id === 'daily-logging');
        expect(daily?.underlayImageSrc).toBeUndefined();
        expect(daily?.placeholderImageSrc).toBe(FEATURE_PLACEHOLDER_IMAGES['daily-logging']);
    });

    it('loops a muted Peptide Education clip on that card only', () => {
        const peptide = coverflowFeatureCards.find((card) => card.id === 'peptide-protocols');
        expect(peptide?.headline).toBe('Peptide Education');
        expect(peptide?.videoMp4Src).toBe('/videos/features/peptide-education.mp4');
        expect(peptide?.videoWebmSrc).toBe('/videos/features/peptide-education.webm');
        expect(peptide?.videoPosterSrc).toBe('/images/features/peptide-education-poster.webp');
        expect(peptide?.videoObjectPosition).toBe('center 45%');
        expect(peptide?.body.toLowerCase()).not.toMatch(/semaglutide|retatrutide/);
        const withVideo = coverflowFeatureCards.filter((card) => card.videoMp4Src);
        expect(withVideo.map((card) => card.id)).toEqual(['peptide-protocols']);

        const mp4 = readFileSync(path.join(root, 'public/videos/features/peptide-education.mp4'));
        const webm = readFileSync(path.join(root, 'public/videos/features/peptide-education.webm'));
        const poster = readFileSync(path.join(root, 'public/images/features/peptide-education-poster.webp'));
        expect(mp4.subarray(4, 8).toString('ascii')).toBe('ftyp');
        expect([...webm.subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
        expect(poster.subarray(0, 4).toString('ascii')).toBe('RIFF');
        expect(poster.subarray(8, 12).toString('ascii')).toBe('WEBP');
        for (const bytes of [mp4, webm, poster]) {
            expect(bytes.length).toBeGreaterThan(8_000);
            expect(bytes.length).toBeLessThan(3_000_000);
        }

        expect(CAROUSEL).toContain('playsInline');
        expect(CAROUSEL).toContain('preload="metadata"');
        expect(CAROUSEL).toContain('controls={false}');
        expect(CAROUSEL).toContain('node.pause()');
        expect(CAROUSEL).toContain("objectPosition: item.videoObjectPosition ?? 'center 45%'");
        expect(CAROUSEL).toContain('features-coverflow-poster-');
        expect(DESKTOP).toContain('card.videoMp4Src');
        expect(MOBILE).toContain('feature.videoMp4Src');

        const html = renderToStaticMarkup(
            createElement(CoverFlowCarousel, {
                items: coverflowFeatureCards.map(toCoverFlowFeatureItem),
            }),
        );
        expect(html).toContain('features-coverflow-video-peptide-protocols');
        expect(html).toContain('peptide-education.mp4');
        expect(html).toContain('peptide-education.webm');
        expect(html).toContain('playsInline');
        expect(html).toContain('preload="metadata"');
        const videoTag = html.match(/<video\b[^>]*>/)?.[0] ?? '';
        expect(videoTag).not.toMatch(/\scontrols[\s=]/);
        expect(html).not.toContain('features-coverflow-video-daily-logging');
        expect(html).not.toContain('features-coverflow-video-wellness-analytics');
    });
});

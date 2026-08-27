import { createElement, type ReactNode } from 'react';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PricingCatalogBody } from '@/components/pricing/PricingCatalogBody';
import { PLANS_LOAD_FROM_CATALOG_COPY } from '@/lib/pricing/catalog';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

function sha256(rel: string): string {
  return createHash('sha256').update(readFileSync(path.join(root, rel))).digest('hex');
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function countLiteral(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const HANNAH_LINE =
  "Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN.";

const FEATURE_CARDS = src('src/components/landing/scroll-sections/shared/featureCards.ts');
const HOME_PAGE = src('src/app/page.tsx');
const HERO = src('src/components/landing/HeroSection.tsx');
const HERO_VARIANT = src('src/components/landing/HeroVariantRenderer.tsx');
const SCROLL = src('src/components/landing/scroll-sections/LandingScrollSections.tsx');
const SCROLL_DESKTOP = src(
  'src/components/landing/scroll-sections/desktop/LandingScrollSectionsDesktop.tsx',
);
const FEATURES_DESKTOP = src(
  'src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx',
);
const PROCESS_DESKTOP = src(
  'src/components/landing/scroll-sections/desktop/ProcessSectionDesktop.tsx',
);
const GENOMICS_DESKTOP = src(
  'src/components/landing/scroll-sections/desktop/GenomicsSectionDesktop.tsx',
);
const ABOUT_DESKTOP = src(
  'src/components/landing/scroll-sections/desktop/AboutSectionDesktop.tsx',
);
const PRICING_SECTION = src('src/components/landing/scroll-sections/PricingSection.tsx');
const FINAL_CTA_DESKTOP = src(
  'src/components/landing/scroll-sections/desktop/FinalCTADesktop.tsx',
);
const PRICING_GRID = src('src/components/pricing/PricingTierGrid.tsx');
const PRICING_BODY = src('src/components/pricing/PricingCatalogBody.tsx');

const MOUNTED_HOME_COMPOSE = [
  HOME_PAGE,
  HERO,
  SCROLL,
  SCROLL_DESKTOP,
  FEATURES_DESKTOP,
  PROCESS_DESKTOP,
  GENOMICS_DESKTOP,
  ABOUT_DESKTOP,
  PRICING_SECTION,
  FINAL_CTA_DESKTOP,
  PRICING_GRID,
  PRICING_BODY,
].join('\n');

const LANDING_AND_HOME_SOURCES = [
  HOME_PAGE,
  FEATURE_CARDS,
  ...walkFiles(path.join(root, 'src/components/landing')).map((file) =>
    readFileSync(file, 'utf8'),
  ),
  ...walkFiles(path.join(root, 'src/components/home')).map((file) => readFileSync(file, 'utf8')),
].join('\n');

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
  }) => createElement('a', { href, className }, children),
}));

describe('Homepage original hero + Brief 45 single compose + catalog membership', () => {
  it('locks the logged-out hero to the original Precision Personal Health landing', () => {
    expect(HERO).toContain('Precision Personal Health');
    expect(HERO).toContain('Powered by Your Data');
    expect(HERO).toContain('text-[#B75E18]');
    expect(HERO).toContain(
      'Precision health insights from your DNA, delivered through formulations engineered for your unique genome',
    );
    expect(HERO).toContain('One Genome  One Formulation  One Life at a Time');
    expect(HERO).toContain('Your Journey Starts Here');
    expect(HERO).toContain('href={variantCtaHref ?? "/signup"}');
    expect(HERO).toContain('href="/login"');
    expect(HERO).toContain('I am a Practitioner or Naturopath');
    expect(HERO).toContain('href="/practitioners"');
    expect(HERO).toContain('HeroPillars');
    expect(HERO).toContain('DNA%20HD.mp4');
    expect(HOME_PAGE).toContain('HeroVariantRenderer');
    expect(HERO_VARIANT).toContain('<HeroSection />');
    expect(HOME_PAGE).toContain('sm:hidden h-[280px]');
    expect(HERO).not.toContain('CAQ → protocol → Bio Optimization Score');
    expect(HERO).not.toContain('Start the CAQ');
    expect(HERO).not.toContain('Clinical Assessment Questionnaire');
    expect(HERO).not.toContain('HOME_CONSUMER_JOB');
    expect(HERO).not.toContain('HOME_CAQ_CTA_LABEL');
    expect(HERO).not.toContain('home-hero-caq-cta');
    expect(HERO).not.toMatch(/Vitality/);
  });

  it('keeps the practitioner waitlist CTA on the public hero and below the fold', () => {
    expect(HERO).toContain('I am a Practitioner or Naturopath');
    expect(HERO).toContain('href="/practitioners"');
    expect(FINAL_CTA_DESKTOP).toContain('I am a Practitioner or Naturopath');
    expect(FINAL_CTA_DESKTOP).toContain('href="/practitioners"');
  });

  it('SSR-composes one of each major homepage block', () => {
    expect(SCROLL).toContain('LandingScrollSectionsDesktop');
    expect(SCROLL).not.toContain('LandingScrollSectionsMobile');
    expect(SCROLL).not.toContain('hidden lg:block');
    expect(SCROLL).not.toContain('block lg:hidden');
    expect(SCROLL_DESKTOP).not.toContain('LandingScrollSectionsMobile');

    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'What You Get')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'Onboarding Questionnaire')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'The Science')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'Who Is Behind This')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'Membership Options')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'ariaLabel="ViaConnect Features"')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'ariaLabel="ViaConnect Process"')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'ariaLabel="ViaConnect Genomics"')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'ariaLabel="About ViaConnect"')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'ariaLabel="ViaConnect Pricing"')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'ariaLabel="Start Today"')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'id={SECTION_IDS.features}')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'id={SECTION_IDS.process}')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'id={SECTION_IDS.genomics}')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'id={SECTION_IDS.about}')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'id={SECTION_IDS.pricing}')).toBe(1);
    expect(countLiteral(MOUNTED_HOME_COMPOSE, 'id={SECTION_IDS.finalCta}')).toBe(1);
  });

  it('shows catalog prices, catalog-load copy, or a bounded wait — never a stuck spinner', () => {
    expect(PRICING_GRID).toContain("useState<PricingCatalogLoadState>({ status: 'empty' })");
    expect(PRICING_GRID).toContain('PRICING_CATALOG_TIMEOUT_MS');
    expect(PRICING_GRID).toContain("setLoadState({ status: 'empty' })");
    expect(PRICING_BODY).toContain('PLANS_LOAD_FROM_CATALOG_COPY');
    expect(PRICING_BODY).toContain('Loading live membership plans');
    expect(PRICING_BODY).toContain('This wait is time limited');
    expect(PRICING_BODY).not.toContain('No membership plans to show');

    const emptyHtml = renderToStaticMarkup(
      createElement(PricingCatalogBody, {
        loadState: { status: 'empty' },
        billingCycle: 'annual',
        onBillingCycleChange: () => undefined,
        currentTierId: null,
        onSelectPlan: () => undefined,
        onRetry: () => undefined,
        showFamilyConfig: false,
        familyPlan: null,
        practitionerToggleId: 'prac-toggle',
        practitionerRegionId: 'prac-region',
        isPractitionerOpen: false,
        onPractitionerToggle: () => undefined,
      }),
    );
    expect(emptyHtml).toContain(PLANS_LOAD_FROM_CATALOG_COPY);
    expect(emptyHtml).not.toContain('Loading live membership plans');
    expect(emptyHtml).not.toMatch(/\$8\.88/);
    expect(emptyHtml).not.toMatch(/\$28\.88/);
  });

  it("keeps Hannah's Brief 44 honesty line and does not regress automatic-feed claims", () => {
    expect(FEATURE_CARDS).toContain(HANNAH_LINE);
    expect(FEATURE_CARDS).not.toMatch(/feed it automatically/i);
    expect(FEATURE_CARDS).not.toMatch(/fed by every device/i);
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/feed it automatically/i);
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/fed by every device/i);
    const comingSoonConnect = [
      /Connect(?:\s+your)?\s+Whoop/i,
      /Connect(?:\s+your)?\s+Oura/i,
      /Connect(?:\s+your)?\s+Garmin/i,
      /Connect(?:\s+your)?\s+Google(?:\s+Health)?/i,
    ];
    for (const pattern of comingSoonConnect) {
      expect(LANDING_AND_HOME_SOURCES).not.toMatch(pattern);
    }
  });

  it('does not introduce TypeScript any, Vitality, or package.json edits', () => {
    expect(HERO).not.toMatch(/\bas any\b/);
    expect(SCROLL).not.toMatch(/\bas any\b/);
    expect(PRICING_GRID).not.toMatch(/\bas any\b/);
    expect(PRICING_BODY).not.toMatch(/\bas any\b/);
    expect(src('src/app/__tests__/brief-45-homepage-one-job.test.ts')).not.toMatch(/\bas any\b/);
    expect(HERO).not.toMatch(/Vitality/);
    expect(FEATURES_DESKTOP).not.toMatch(/Vitality/);
    expect(sha256('package.json')).toBe(
      '063e568f5cfd91d78c94ad76f1d3c59a048f59bd5eea540af8c3e037a9bdec7d',
    );
  });
});

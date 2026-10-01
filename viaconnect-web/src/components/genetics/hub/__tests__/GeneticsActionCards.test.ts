// Prompt 191 Task D (2026-06-12): contract tests for the four GeneticsActionCards.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). The four cards share one parameterized ActionCard shell that renders
// a single true Next.js anchor (<Link href={href} ...>) and receives each
// card's destination as an href prop. These tests therefore lock two things:
//   1. the shell is a TRUE anchor (<Link href={href}), never a role="link" +
//      onClick fake link, and has no nested interactive element; and
//   2. each of the four exported cards passes the correct destination literal
//      (/genetics/upload, /plugins/labs, /shop#category-snp, /shop).
// They also lock the section-tab CTA treatment (replacing the blue glass
// pill), the shortened visible labels, the full original aria phrases, the
// Lucide stroke width, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'GeneticsActionCards.tsx');

describe('GeneticsActionCards source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('imports the Next.js Link component', () => {
    expect(source).toContain("import Link from 'next/link'");
  });

  it('renders a single true anchor shell (Link wrapping the tile)', () => {
    expect(source).toContain('<Link');
    expect(source).toContain('href={href}');
  });

  it('does NOT use role="link" + onClick fake links anywhere', () => {
    expect(source).not.toContain('role="link"');
    expect(source).not.toContain('onClick');
    expect(source).not.toContain('useRouter');
    expect(source).not.toContain('router.push');
  });

  it('exports all four named action cards', () => {
    expect(source).toContain('export function UploadDnaCard');
    expect(source).toContain('export function UploadLabCard');
    expect(source).toContain('export function SnpFormulationsCard');
    expect(source).toContain('export function OrderPanelsCard');
  });

  it('points UploadDnaCard at /genetics/upload and UploadLabCard at /plugins/labs', () => {
    // Prompt 204: the two upload cards route to DISTINCT surfaces. The DNA card
    // is the only /genetics/upload destination; the Lab card routes to the real
    // Connect Lab Results page so the two tabs no longer share one target.
    const geneticMatches = source.match(/href="\/genetics\/upload"/g) ?? [];
    expect(geneticMatches.length).toBe(1);
    expect(source).toContain('href="/plugins/labs"');
  });

  it('points SnpFormulationsCard at /shop#category-snp', () => {
    expect(source).toContain('href="/shop#category-snp"');
  });

  it('points OrderPanelsCard at /shop', () => {
    expect(source).toContain('href="/shop"');
  });

  it('keeps the DNA and Lab media seams and styles the chip as a section tab', () => {
    expect(source).toContain('GENETICS_CARD_MEDIA.uploadDna');
    expect(source).toContain('GENETICS_CARD_MEDIA.uploadLab');
    expect(source).toContain('GENETICS_ACTION_TAB_CTA_CLASS');
    expect(source).toContain('data-genetics-action-cta');
    expect(source).not.toContain('accent="blue"');
    expect(source).not.toContain('accent="teal"');
    expect(source).not.toContain('accent="orange"');
    expect(source).not.toContain('backdrop-blur-md');
    expect(source).not.toContain('text-shadow');
  });

  it('shows the shortened labels and keeps the original phrases in the accessible name', () => {
    expect(source).toContain('ctaLabel={GENETICS_ACTION_CTA_COPY.uploadDna.visible}');
    expect(source).toContain('ctaAriaLabel={GENETICS_ACTION_CTA_COPY.uploadDna.aria}');
    expect(source).toContain('ctaLabel={GENETICS_ACTION_CTA_COPY.uploadLabs.visible}');
    expect(source).toContain('ctaAriaLabel={GENETICS_ACTION_CTA_COPY.uploadLabs.aria}');
    expect(source).toContain('ctaLabel={GENETICS_ACTION_CTA_COPY.catalog.visible}');
    expect(source).toContain('ctaAriaLabel={GENETICS_ACTION_CTA_COPY.catalog.aria}');
    expect(source).toContain('ctaLabel={GENETICS_ACTION_CTA_COPY.panels.visible}');
    expect(source).toContain('ctaAriaLabel={GENETICS_ACTION_CTA_COPY.panels.aria}');
    expect(source).toContain('aria-label={`${title}. ${description}. ${ctaAriaLabel}`}');
    expect(source).not.toContain('ctaLabel="Upload DNA"');
    expect(source).not.toContain('ctaLabel="Upload Labs"');
    expect(source).not.toContain('ctaLabel="Browse Catalog"');
    expect(source).not.toContain('ctaLabel="View Panels"');
  });

  it('uses the ShoppingCart icon for the SNP formulations CTA', () => {
    expect(source).toContain('ctaIcon={ShoppingCart}');
  });

  it('uses Lucide strokeWidth 1.5 on its icons', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

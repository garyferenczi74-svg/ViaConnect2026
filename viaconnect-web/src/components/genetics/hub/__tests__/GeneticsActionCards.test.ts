// Prompt 191 Task D (2026-06-12): contract tests for the four GeneticsActionCards.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). The four cards share one parameterized ActionCard shell that renders
// a single true Next.js anchor (<Link href={href} ...>) and receives each
// card's destination as an href prop. These tests therefore lock two things:
//   1. the shell is a TRUE anchor (<Link href={href}), never a role="link" +
//      onClick fake link, and has no nested interactive element; and
//   2. each of the four exported cards passes the correct destination literal
//      (/genetics/upload x2, /shop#category-snp, /shop).
// They also lock the blue glass CTA accent (Prompt 193d), the Lucide stroke
// width, and the no dash rule.

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

  it('points UploadDnaCard and UploadLabCard at /genetics/upload', () => {
    // Two upload cards both route to the real upload flow.
    const matches = source.match(/href="\/genetics\/upload"/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('points SnpFormulationsCard at /shop#category-snp', () => {
    expect(source).toContain('href="/shop#category-snp"');
  });

  it('points OrderPanelsCard at /shop', () => {
    expect(source).toContain('href="/shop"');
  });

  it('keeps the DNA and Lab media seams and gives every card the blue glass CTA pill', () => {
    expect(source).toContain('GENETICS_CARD_MEDIA.uploadDna');
    expect(source).toContain('GENETICS_CARD_MEDIA.uploadLab');
    // Prompt 193d (Gary 2026-06-13): all four action card CTA pills are now the
    // blue glass treatment; the teal / orange accents are no longer used here.
    expect(source).toContain('accent="blue"');
    expect(source).not.toContain('accent="teal"');
    expect(source).not.toContain('accent="orange"');
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

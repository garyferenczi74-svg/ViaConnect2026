import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PREVIEW_STATE_LABEL,
  PREVIEW_VARIANTS,
  VARIANTS_EXPLORER_EDUCATIONAL_LINE,
} from '../variantsExplorerPreview';
import { protocolChangeLine } from '@/lib/genetics/protocolChangeLine';

const PREVIEW = path.resolve(__dirname, '..', 'VariantsExplorerPreview.tsx');
const MOBILE = path.resolve(__dirname, '..', '..', 'mobile', 'GenomicsSectionMobile.tsx');
const DESKTOP = path.resolve(__dirname, '..', '..', 'desktop', 'GenomicsSectionDesktop.tsx');

describe('Variants Explorer Preview honesty', () => {
  it('labels the teal card Demo and never Your variant', () => {
    expect(PREVIEW_STATE_LABEL.demo).toBe('Demo');
    expect(PREVIEW_VARIANTS.some((v) => v.state === 'demo')).toBe(true);
    expect(Object.values(PREVIEW_STATE_LABEL)).not.toContain('Your variant');
  });

  it('keeps Unanalyzed as a word, not a number and not n/a', () => {
    expect(PREVIEW_STATE_LABEL.unanalyzed).toBe('Unanalyzed');
    expect(PREVIEW_STATE_LABEL.unanalyzed).not.toBe('0');
    expect(PREVIEW_STATE_LABEL.unanalyzed).not.toBe('n/a');
  });

  it('states educational not diagnostic', () => {
    expect(VARIANTS_EXPLORER_EDUCATIONAL_LINE.toLowerCase()).toContain('educational');
    expect(VARIANTS_EXPLORER_EDUCATIONAL_LINE.toLowerCase()).toContain('not a diagnosis');
  });

  it('does not emit a protocol-change line without a real delta', () => {
    expect(protocolChangeLine(null)).toBeNull();
  });

  it('bans genotype / COMT / CLOCK / MTHFR copy on Demo Explorer', () => {
    const blob = JSON.stringify(PREVIEW_VARIANTS);
    expect(blob).not.toMatch(/\bMTHFR\b/);
    expect(blob).not.toMatch(/\bCOMT\b/);
    expect(blob).not.toMatch(/\bCLOCK\b/);
    expect(blob).not.toMatch(/\brs\d+\b/i);
    expect(blob).toContain('GeneXM');
    expect(blob).not.toContain('GeneX-M');
  });
});

describe('VariantsExplorerPreview source', () => {
  const source = readFileSync(PREVIEW, 'utf-8');
  const mobile = readFileSync(MOBILE, 'utf-8');
  const desktop = readFileSync(DESKTOP, 'utf-8');

  it('uses existing Demo badge chrome and Lucide 1.5', () => {
    expect(source).toContain('function DemoBadge');
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain('Demo');
    expect(source).not.toContain('Your variant');
    expect(source).toContain('protocolChangeLine');
    expect(source).toContain('VARIANTS_EXPLORER_EDUCATIONAL_LINE');
  });

  it('is the only preview chrome for desktop and mobile', () => {
    expect(mobile).toContain('VariantsExplorerPreview');
    expect(desktop).toContain('VariantsExplorerPreview');
    expect(mobile).not.toContain('Your variant');
    expect(desktop).not.toContain('Your variant');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

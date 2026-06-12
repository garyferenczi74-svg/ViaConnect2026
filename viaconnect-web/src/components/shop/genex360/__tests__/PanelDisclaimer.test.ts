// Prompt 193 Task T2 (2026-06-12): contract tests for PanelDisclaimer.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the verbatim base disclaimer, the verbatim peptide-iq and
// cannabis-iq appended sentences, the slug branching, the Lucide icon at
// strokeWidth 1.5, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'PanelDisclaimer.tsx');

describe('PanelDisclaimer source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('renders the verbatim base disclaimer first sentence', () => {
    expect(source).toContain(
      'GENEX360 panels, including this one, are intended for wellness, education, and personal insight.',
    );
  });

  it('renders the full verbatim base disclaimer', () => {
    expect(source).toContain(
      'GENEX360 panels, including this one, are intended for wellness, education, and personal insight. They are not a diagnosis, treatment, or cure for any condition, and they do not replace advice from a qualified healthcare professional. Genetic and biomarker results describe tendencies and probabilities, not certainties. Always consult a licensed practitioner before making changes to your health, medication, or supplement routine.',
    );
  });

  it('appends the verbatim peptide-iq sentence under a peptide-iq slug check', () => {
    expect(source).toContain('slug === "peptide-iq"');
    expect(source).toContain(
      'PeptideIQ is educational and intended for practitioner guided interpretation. Via Cura does not sell peptides as commercial products.',
    );
  });

  it('appends the verbatim cannabis-iq sentence under a cannabis-iq slug check', () => {
    expect(source).toContain('slug === "cannabis-iq"');
    expect(source).toContain(
      'CannabisIQ is informational only and is not medical advice or a recommendation to use any substance. Legal status varies by region, and choices are your own.',
    );
  });

  it('types the slug prop from the data layer PanelSlug', () => {
    expect(source).toContain("import type { PanelSlug } from \"@/data/genex360/types\"");
  });

  it('uses a Lucide icon at strokeWidth 1.5', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('contains no emoji marker glyphs in copy', () => {
    // The disclaimer is text only with a single Lucide leading icon.
    expect(source).not.toContain('✅'); // white heavy check mark
    expect(source).not.toContain('✔'); // heavy check mark
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

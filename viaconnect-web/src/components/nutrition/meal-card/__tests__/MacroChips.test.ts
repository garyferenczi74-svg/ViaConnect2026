// Prompt 172 Phase 1A + 1B: MacroChips source presence sanity.
//
// Phase 1A contract: render four chips in the fixed order Calories, Protein,
// Carbs, Fat (per spec section 5.3) in a token driven palette.
// Phase 1B contract additions:
//   - safetyMode renders three chips in order Protein, Carbs, Fat with
//     composition percentages (proteinPct, carbsPct, fatsPct) per 170c 8.4.
//   - the absolute kcal chip is hidden in safety mode.
//   - labels read through getMicrocopy with the appropriate variant; no
//     hardcoded label literals in MacroChips.
//   - no visible mode indicator class or text.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '..', 'MacroChips.tsx');

describe('MacroChips source', () => {
  const source = readFileSync(FILE, 'utf-8');

  describe('normal mode (four chip variant)', () => {
    it('renders chips in the fixed order Calories Protein Carbs Fat via microcopy keys', () => {
      // The safety mode branch comes first in source order, so we slice the
      // normal mode block by anchoring on the canonical "normal' as const"
      // string the normal branch declares before its JSX return.
      const normalStart = source.indexOf("const variant = 'normal' as const;");
      expect(normalStart).toBeGreaterThan(-1);
      const normalBlock = source.substring(normalStart);
      const idxCal = normalBlock.indexOf("getMicrocopy('chips.calories.label'");
      const idxPro = normalBlock.indexOf("getMicrocopy('chips.protein.label'");
      const idxCar = normalBlock.indexOf("getMicrocopy('chips.carbs.label'");
      const idxFat = normalBlock.indexOf("getMicrocopy('chips.fats.label'");
      expect(idxCal).toBeGreaterThan(-1);
      expect(idxPro).toBeGreaterThan(idxCal);
      expect(idxCar).toBeGreaterThan(idxPro);
      expect(idxFat).toBeGreaterThan(idxCar);
    });

    it('uses kcal unit on Calories chip and g unit on macro chips', () => {
      // The unit prop drives the rendered unit string. Normal mode passes
      // unit="kcal" on the Calories chip and unit="g" on the three macro
      // chips.
      expect(source).toContain('unit="kcal"');
      expect(source).toContain('unit="g"');
    });

    it('applies Math.round for kcal and toFixed(1) for grams', () => {
      expect(source).toContain('Math.round');
      expect(source).toContain('.toFixed(1)');
    });
  });

  describe('safety mode (three chip ratio variant per 170c 8.4)', () => {
    it('branches on the safetyMode prop and renders a separate JSX block', () => {
      expect(source).toContain('if (safetyMode)');
    });

    it('renders three chips in order Protein Carbs Fat (no Calories chip)', () => {
      // The safety mode branch lives between `if (safetyMode)` and the
      // canonical normal branch anchor `const variant = 'normal' as const;`.
      const ifIdx = source.indexOf('if (safetyMode)');
      const normalAnchorIdx = source.indexOf("const variant = 'normal' as const;");
      expect(ifIdx).toBeGreaterThan(-1);
      expect(normalAnchorIdx).toBeGreaterThan(ifIdx);
      const safetyBlock = source.substring(ifIdx, normalAnchorIdx);
      // The Calories chip key must NOT appear in the safety mode block.
      expect(safetyBlock).not.toContain('chips.calories.label');
      const idxPro = safetyBlock.indexOf('chips.protein.label');
      const idxCar = safetyBlock.indexOf('chips.carbs.label');
      const idxFat = safetyBlock.indexOf('chips.fats.label');
      expect(idxPro).toBeGreaterThan(-1);
      expect(idxCar).toBeGreaterThan(idxPro);
      expect(idxFat).toBeGreaterThan(idxCar);
    });

    it('renders percentage values (proteinPct, carbsPct, fatsPct) instead of grams', () => {
      expect(source).toContain('macros.proteinPct');
      expect(source).toContain('macros.carbsPct');
      expect(source).toContain('macros.fatsPct');
    });

    it('uses the percent unit in safety mode chips', () => {
      // The unit token 'percent' renders as %.
      expect(source).toContain('"percent"');
    });

    it('renders the chips inside a grid-cols-3 container (no kcal column)', () => {
      // The container layout shifts from four columns to three because the
      // kcal chip is removed.
      expect(source).toContain('grid-cols-3');
    });

    it('passes the safety_mode variant to getMicrocopy in the safety branch', () => {
      const ifIdx = source.indexOf('if (safetyMode)');
      const normalAnchorIdx = source.indexOf("const variant = 'normal' as const;");
      const safetyBlock = source.substring(ifIdx, normalAnchorIdx);
      expect(safetyBlock).toContain("'safety_mode'");
    });
  });

  describe('no visible mode indicator (170c 8.4 silent UX hard rule)', () => {
    it('contains no className token like safety-mode or ratio-mode', () => {
      expect(source).not.toContain('safety-mode');
      expect(source).not.toContain('ratio-mode');
    });

    it('contains no JSX text rendering the words safety mode or ratio mode', () => {
      // The literal word combos must never appear as rendered text in JSX.
      expect(source).not.toMatch(/>\s*safety mode\s*</i);
      expect(source).not.toMatch(/>\s*ratio mode\s*</i);
      expect(source).not.toMatch(/>\s*silent mode\s*</i);
    });
  });

  describe('brand tokens and hard rules', () => {
    it('applies brand tokens for chip palette (Teal Calories, Orange Protein)', () => {
      expect(source).toContain('#2DA5A0');
      expect(source).toContain('#B75E18');
    });

    it('declares the MacroChips component as a stateless props consumer', () => {
      expect(source).toContain('export function MacroChips');
      expect(source).not.toContain('useState');
      expect(source).not.toContain('useEffect');
    });

    it('contains no em or en dashes', () => {
      expect(source.includes('—')).toBe(false);
      expect(source.includes('–')).toBe(false);
    });

    it('reads all labels from microcopy (no hardcoded chip label literals)', () => {
      const SOURCE_AFTER_HEADER = source.substring(source.indexOf("'use client'"));
      // No bare label literals in the JSX text content.
      expect(SOURCE_AFTER_HEADER).not.toContain('"Calories"');
      expect(SOURCE_AFTER_HEADER).not.toContain('"Protein"');
      expect(SOURCE_AFTER_HEADER).not.toContain('"Carbs"');
      // "Fat" alone is too short to be a unique substring (Fat appears in
      // tone="fats" and label="..." labels), so we instead assert the
      // label="Fat" attribute pattern is absent.
      expect(SOURCE_AFTER_HEADER).not.toContain('label="Fat"');
    });
  });

  describe('percentage sum invariant in safety mode (derived percentages)', () => {
    it('does not introduce its own arithmetic; reads precomputed Pct values from props', () => {
      // The percentages come from the mapper, so MacroChips does not divide
      // or compute its own percent values. We assert no division of macros
      // in the safety mode branch.
      const ifIdx = source.indexOf('if (safetyMode)');
      const normalAnchorIdx = source.indexOf("const variant = 'normal' as const;");
      const safetyBlock = source.substring(ifIdx, normalAnchorIdx);
      expect(safetyBlock).not.toContain('* 100');
    });
  });
});

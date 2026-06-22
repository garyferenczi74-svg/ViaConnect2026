// Prompt 208a Module B (2026-06-22): unit tests for the diplotype engine.
// No em/en-dashes. No emojis.

import { describe, it, expect } from 'vitest';
import {
  countLofAlleles,
  metabolizerFromLof,
  callDiplotype,
  callAllDiplotypes,
  DIPLOTYPE_DEFINITIONS,
} from '../diplotype';

// ---------------------------------------------------------------------------
// countLofAlleles
// ---------------------------------------------------------------------------

describe('countLofAlleles', () => {
  it('returns 2 for homozygous risk (AA, risk A)', () => {
    expect(countLofAlleles('AA', 'A')).toBe(2);
  });

  it('returns 1 for heterozygous (GA, risk A)', () => {
    expect(countLofAlleles('GA', 'A')).toBe(1);
  });

  it('returns 0 for homozygous reference (GG, risk A)', () => {
    expect(countLofAlleles('GG', 'A')).toBe(0);
  });

  it('returns 0 for null input', () => {
    expect(countLofAlleles(null, 'A')).toBe(0);
  });

  it('handles separator-delimited genotype G/A correctly', () => {
    expect(countLofAlleles('G/A', 'A')).toBe(1);
  });

  it('is case-insensitive on both sides', () => {
    expect(countLofAlleles('ga', 'a')).toBe(1);
  });

  it('returns 0 for a non-diploid/uninterpretable string', () => {
    // A three-base normalized token is not a clean diploid call.
    expect(countLofAlleles('AAA', 'A')).toBe(0);
  });

  it('returns 2 for homozygous risk C (CYP2C9 *3 pattern)', () => {
    expect(countLofAlleles('CC', 'C')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// metabolizerFromLof
// ---------------------------------------------------------------------------

describe('metabolizerFromLof', () => {
  it('0 LOF -> normal', () => {
    expect(metabolizerFromLof(0)).toBe('normal');
  });

  it('1 LOF -> intermediate', () => {
    expect(metabolizerFromLof(1)).toBe('intermediate');
  });

  it('2 LOF -> poor', () => {
    expect(metabolizerFromLof(2)).toBe('poor');
  });

  it('3 LOF -> poor (capped at poor)', () => {
    expect(metabolizerFromLof(3)).toBe('poor');
  });
});

// ---------------------------------------------------------------------------
// callDiplotype
// ---------------------------------------------------------------------------

describe('callDiplotype', () => {
  const cyp2c19Def = DIPLOTYPE_DEFINITIONS.find((d) => d.gene === 'CYP2C19')!;

  it('CYP2C19 with rs4244285 AA -> poor metabolizer, *2 in diplotype', () => {
    const result = callDiplotype(cyp2c19Def, { rs4244285: 'AA', rs4986893: 'GG' });
    expect(result).not.toBeNull();
    expect(result!.metabolizer).toBe('poor');
    expect(result!.diplotype).toContain('*2');
  });

  it('CYP2C19 with rs4244285 GA -> intermediate metabolizer', () => {
    const result = callDiplotype(cyp2c19Def, { rs4244285: 'GA', rs4986893: 'GG' });
    expect(result).not.toBeNull();
    expect(result!.metabolizer).toBe('intermediate');
  });

  it('CYP2C19 all reference -> normal metabolizer, *1/*1', () => {
    const result = callDiplotype(cyp2c19Def, { rs4244285: 'GG', rs4986893: 'GG' });
    expect(result).not.toBeNull();
    expect(result!.metabolizer).toBe('normal');
    expect(result!.diplotype).toBe('*1/*1');
  });

  it('returns null when none of the gene rsIDs are present', () => {
    const result = callDiplotype(cyp2c19Def, { rs9999999: 'AA' });
    expect(result).toBeNull();
  });

  it('compound heterozygous (*2/*3): rs4244285 GA + rs4986893 GA -> poor, both stars in diplotype', () => {
    const result = callDiplotype(cyp2c19Def, { rs4244285: 'GA', rs4986893: 'GA' });
    expect(result).not.toBeNull();
    expect(result!.metabolizer).toBe('poor');
    expect(result!.diplotype).toContain('*2');
    expect(result!.diplotype).toContain('*3');
  });

  it('confidence is always panel-based', () => {
    const result = callDiplotype(cyp2c19Def, { rs4244285: 'GA' });
    expect(result!.confidence).toBe('panel-based');
  });

  it('evidenceTier matches the definition', () => {
    const result = callDiplotype(cyp2c19Def, { rs4244285: 'GA' });
    expect(result!.evidenceTier).toBe(2);
  });

  it('works when only one of the two gene rsIDs is present', () => {
    // Only rs4244285 present; rs4986893 absent -> still assessable
    const result = callDiplotype(cyp2c19Def, { rs4244285: 'GG' });
    expect(result).not.toBeNull();
    expect(result!.metabolizer).toBe('normal');
  });
});

// ---------------------------------------------------------------------------
// callAllDiplotypes
// ---------------------------------------------------------------------------

describe('callAllDiplotypes', () => {
  it('drops genes whose rsIDs are not in the map', () => {
    // Only CYP2D6 rs3892097 present
    const calls = callAllDiplotypes({ rs3892097: 'GA' });
    expect(calls.length).toBe(1);
    expect(calls[0].gene).toBe('CYP2D6');
  });

  it('returns all three genes when all rsIDs are present', () => {
    const calls = callAllDiplotypes({
      rs4244285: 'GG',
      rs4986893: 'GG',
      rs3892097: 'GG',
      rs1057910: 'GG',
    });
    const genes = calls.map((c) => c.gene);
    expect(genes).toContain('CYP2C19');
    expect(genes).toContain('CYP2D6');
    expect(genes).toContain('CYP2C9');
  });

  it('returns [] when genotypeByRsid is empty', () => {
    expect(callAllDiplotypes({})).toEqual([]);
  });

  it('CYP2C9 *3/*3 -> poor when rs1057910 is CC', () => {
    const calls = callAllDiplotypes({ rs1057910: 'CC' });
    const call = calls.find((c) => c.gene === 'CYP2C9');
    expect(call).toBeDefined();
    expect(call!.metabolizer).toBe('poor');
    expect(call!.diplotype).toBe('*3/*3');
  });
});

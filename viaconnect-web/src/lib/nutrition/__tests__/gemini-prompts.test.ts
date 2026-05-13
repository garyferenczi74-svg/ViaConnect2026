import { describe, it, expect } from 'vitest';
import {
  TEXT_PARSE_SYSTEM_INSTRUCTION,
  PHOTO_PARSE_SYSTEM_INSTRUCTION,
  ESTIMATION_FALLBACK_INSTRUCTION,
  GEMINI_MODEL,
} from '../gemini-prompts';

describe('Gemini prompts', () => {
  it('uses gemini-2.5-flash', () => {
    expect(GEMINI_MODEL).toBe('gemini-2.5-flash');
  });
  it('text instruction tells the model to emit JSON only', () => {
    expect(TEXT_PARSE_SYSTEM_INSTRUCTION).toMatch(/JSON object/);
    expect(TEXT_PARSE_SYSTEM_INSTRUCTION).toMatch(/no preamble/i);
  });
  it('text instruction lists every allowed unit', () => {
    for (const u of ['whole','slice','cup','tbsp','tsp','g','oz','ml','medium','large','small','serving']) {
      expect(TEXT_PARSE_SYSTEM_INSTRUCTION).toContain(u);
    }
  });
  it('photo instruction extends text instruction', () => {
    expect(PHOTO_PARSE_SYSTEM_INSTRUCTION.length).toBeGreaterThan(TEXT_PARSE_SYSTEM_INSTRUCTION.length);
  });
  it('estimation fallback asks for the macro JSON shape', () => {
    expect(ESTIMATION_FALLBACK_INSTRUCTION).toMatch(/calories/);
    expect(ESTIMATION_FALLBACK_INSTRUCTION).toMatch(/protein_g/);
  });
  it('no prompt contains em-dashes or en-dashes', () => {
    const all = TEXT_PARSE_SYSTEM_INSTRUCTION + PHOTO_PARSE_SYSTEM_INSTRUCTION + ESTIMATION_FALLBACK_INSTRUCTION;
    expect(all).not.toMatch(/[–—]/);
  });
});

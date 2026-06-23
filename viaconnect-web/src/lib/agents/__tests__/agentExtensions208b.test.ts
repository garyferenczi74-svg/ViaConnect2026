/**
 * Tests for Prompt 208b extension blocks.
 * Verifies:
 *   1. Each file contains the 208b START/END markers exactly once.
 *   2. Each new directive is exported and is a non-empty string with required keywords.
 *   3. Existing 208a exports are unchanged (representative phrase check).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---- file-content helpers ----

function readSrc(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

const HANNAH_FILE  = 'src/lib/ai/hannah/ultrathink/prompts/ultrathink-system.ts';
const GORDON_FILE  = 'src/lib/agents/gordon/systemPrompt.ts';
const ARNOLD_FILE  = 'src/lib/arnold/arnoldSystemPrompt.ts';
const JEFFERY_FILE = 'src/lib/agents/jeffery/guardrails.ts';

// ---- 1. Marker presence (exactly once per file) ----

describe('Prompt 208b markers', () => {
  const START = '// === PROMPT 208b EXTENSION START ===';
  const END   = '// === PROMPT 208b EXTENSION END ===';

  function occurrences(src: string, needle: string): number {
    return src.split(needle).length - 1;
  }

  it.each([
    [HANNAH_FILE],
    [GORDON_FILE],
    [ARNOLD_FILE],
    [JEFFERY_FILE],
  ])('%s contains the 208b START marker exactly once', (file) => {
    expect(occurrences(readSrc(file), START)).toBe(1);
  });

  it.each([
    [HANNAH_FILE],
    [GORDON_FILE],
    [ARNOLD_FILE],
    [JEFFERY_FILE],
  ])('%s contains the 208b END marker exactly once', (file) => {
    expect(occurrences(readSrc(file), END)).toBe(1);
  });
});

// ---- 2. Exported directives: non-empty + keyword presence ----

describe('HANNAH_208B_DIRECTIVE', () => {
  it('is exported and is a non-empty string', async () => {
    const { HANNAH_208B_DIRECTIVE } = await import(
      '@/lib/ai/hannah/ultrathink/prompts/ultrathink-system'
    );
    expect(typeof HANNAH_208B_DIRECTIVE).toBe('string');
    expect(HANNAH_208B_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it('mentions "contract" and "reconciled"', async () => {
    const { HANNAH_208B_DIRECTIVE } = await import(
      '@/lib/ai/hannah/ultrathink/prompts/ultrathink-system'
    );
    const lower = HANNAH_208B_DIRECTIVE.toLowerCase();
    expect(lower).toMatch(/contract/);
    expect(lower).toMatch(/reconciled/);
  });
});

describe('GORDON_208B_DIRECTIVE', () => {
  it('is exported and is a non-empty string', async () => {
    const { GORDON_208B_DIRECTIVE } = await import(
      '@/lib/agents/gordon/systemPrompt'
    );
    expect(typeof GORDON_208B_DIRECTIVE).toBe('string');
    expect(GORDON_208B_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it('mentions "energy balance" and "glycemic"', async () => {
    const { GORDON_208B_DIRECTIVE } = await import(
      '@/lib/agents/gordon/systemPrompt'
    );
    const lower = GORDON_208B_DIRECTIVE.toLowerCase();
    expect(lower).toMatch(/energy balance/);
    expect(lower).toMatch(/glycemic/);
  });
});

describe('ARNOLD_208B_DIRECTIVE', () => {
  it('is exported and is a non-empty string', async () => {
    const { ARNOLD_208B_DIRECTIVE } = await import(
      '@/lib/arnold/arnoldSystemPrompt'
    );
    expect(typeof ARNOLD_208B_DIRECTIVE).toBe('string');
    expect(ARNOLD_208B_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it('mentions "energy balance" and "composition"', async () => {
    const { ARNOLD_208B_DIRECTIVE } = await import(
      '@/lib/arnold/arnoldSystemPrompt'
    );
    const lower = ARNOLD_208B_DIRECTIVE.toLowerCase();
    expect(lower).toMatch(/energy balance/);
    expect(lower).toMatch(/composition/);
  });
});

describe('JEFFERY_208B_DIRECTIVE', () => {
  it('is exported and is a non-empty string', async () => {
    const { JEFFERY_208B_DIRECTIVE } = await import(
      '@/lib/agents/jeffery/guardrails'
    );
    expect(typeof JEFFERY_208B_DIRECTIVE).toBe('string');
    expect(JEFFERY_208B_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it('mentions "conflict" and "contract"', async () => {
    const { JEFFERY_208B_DIRECTIVE } = await import(
      '@/lib/agents/jeffery/guardrails'
    );
    const lower = JEFFERY_208B_DIRECTIVE.toLowerCase();
    expect(lower).toMatch(/conflict/);
    expect(lower).toMatch(/contract/);
  });
});

// ---- 3. Existing 208a exports unchanged ----

describe('208a exports unchanged', () => {
  it('HANNAH_208A_DIRECTIVE still contains "concordance weighting"', async () => {
    const { HANNAH_208A_DIRECTIVE } = await import(
      '@/lib/ai/hannah/ultrathink/prompts/ultrathink-system'
    );
    expect(HANNAH_208A_DIRECTIVE).toMatch(/concordance weighting/i);
  });

  it('GORDON_208A_DIRECTIVE still contains "allergen"', async () => {
    const { GORDON_208A_DIRECTIVE } = await import(
      '@/lib/agents/gordon/systemPrompt'
    );
    expect(GORDON_208A_DIRECTIVE).toMatch(/allergen/i);
  });

  it('ARNOLD_208A_DIRECTIVE still contains "concordance-aware metric context"', async () => {
    const { ARNOLD_208A_DIRECTIVE } = await import(
      '@/lib/arnold/arnoldSystemPrompt'
    );
    expect(ARNOLD_208A_DIRECTIVE).toMatch(/concordance-aware metric context/i);
  });

  it('JEFFERY_208A_DIRECTIVE still contains "arbitration audit trail"', async () => {
    const { JEFFERY_208A_DIRECTIVE } = await import(
      '@/lib/agents/jeffery/guardrails'
    );
    expect(JEFFERY_208A_DIRECTIVE).toMatch(/arbitration audit trail/i);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAUDE_HAIKU, CLAUDE_OPUS, CLAUDE_SONNET } from '@/lib/ai/claude-models';

const RETIRED_SONNET_4 = 'claude-sonnet-4-20250514';
const UNLISTED_SONNET = 'claude-sonnet-4-6-20250514';
const UNLISTED_OPUS = 'claude-opus-4-7-20250520';

describe('claude model IDs', () => {
  it('exports the Anthropic IDs verified on 2026-10-05', () => {
    expect(CLAUDE_SONNET).toBe('claude-sonnet-4-6');
    expect(CLAUDE_HAIKU).toBe('claude-haiku-4-5-20251001');
    expect(CLAUDE_OPUS).toBe('claude-opus-4-7');
  });

  it('keeps Deno mirrors on CLAUDE_SONNET', () => {
    const root = process.cwd();
    const web = readFileSync(
      join(root, 'supabase/functions/ultrathink-knowledge-processor/index.ts'),
      'utf8',
    );
    const mobile = readFileSync(
      join(root, '../viaconnect-mobile/supabase/functions/ai-consensus-engine/index.ts'),
      'utf8',
    );
    for (const src of [web, mobile]) {
      expect(src).toContain(CLAUDE_SONNET);
      expect(src).not.toContain(RETIRED_SONNET_4);
      expect(src).not.toContain(UNLISTED_SONNET);
    }
  });

  it('does not leave retired or unlisted IDs in the extraction config', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/caq/supplement-extraction/config.ts'),
      'utf8',
    );
    expect(src).not.toContain(RETIRED_SONNET_4);
    expect(src).not.toContain(UNLISTED_OPUS);
    expect(src).toContain('CLAUDE_SONNET');
    expect(src).toContain('CLAUDE_HAIKU');
    expect(src).toContain('CLAUDE_OPUS');
  });
});

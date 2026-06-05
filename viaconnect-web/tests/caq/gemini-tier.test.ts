// Prompt 175b (2026-06-04): Gemini tier + provider-router unit tests.
//
// Covers the pieces that don't require a live network call:
//   * extractGeminiTextBlock walks the candidates -> content -> parts
//     chain and tolerates the shapes Gemini actually returns
//   * runProviderRouter behavior under the env-key combinations we
//     ship in production (both keys, one key, no keys)
//
// The HTTP call itself lands in a follow-up integration test once the
// staging Vercel preview has both PHOTO_AI_GEMINI_API_KEY and
// PHOTO_AI_ANTHROPIC_API_KEY set.

import { describe, it, expect } from 'vitest';
import {
  extractGeminiTextBlock,
} from '@/lib/caq/supplement-extraction/gemini-tier';
import { runProviderRouter } from '@/lib/caq/supplement-extraction/provider-router';

describe('extractGeminiTextBlock', () => {
  it('returns the first text part from a well-formed Gemini response', () => {
    const body = {
      candidates: [
        {
          content: {
            parts: [{ text: '{"items":[]}' }],
          },
        },
      ],
    };
    expect(extractGeminiTextBlock(body)).toBe('{"items":[]}');
  });

  it('walks past empty text parts to find the first non-empty one', () => {
    const body = {
      candidates: [{ content: { parts: [{ text: '' }, { text: '{"items":[]}' }] } }],
    };
    expect(extractGeminiTextBlock(body)).toBe('{"items":[]}');
  });

  it('returns empty string when candidates is missing', () => {
    expect(extractGeminiTextBlock({})).toBe('');
    expect(extractGeminiTextBlock(null)).toBe('');
    expect(extractGeminiTextBlock(undefined)).toBe('');
  });

  it('returns empty string when the candidate has no content.parts text', () => {
    expect(extractGeminiTextBlock({ candidates: [{}] })).toBe('');
    expect(extractGeminiTextBlock({ candidates: [{ content: {} }] })).toBe('');
    expect(extractGeminiTextBlock({ candidates: [{ content: { parts: [] } }] })).toBe('');
  });

  it('does not throw on malformed shapes', () => {
    expect(() => extractGeminiTextBlock('a string')).not.toThrow();
    expect(extractGeminiTextBlock('a string')).toBe('');
    expect(() => extractGeminiTextBlock({ candidates: 'nope' })).not.toThrow();
    expect(extractGeminiTextBlock({ candidates: [{ content: { parts: 'nope' } }] })).toBe('');
  });
});

describe('runProviderRouter (no-key paths)', () => {
  it('returns config_missing when neither provider key is configured', async () => {
    // 175b hotfix: Claude is now primary, so the attempt is tagged 'sonnet'
    // when no anthropic key is configured even with no gemini key either.
    const r = await runProviderRouter({
      geminiApiKey: null,
      anthropicApiKey: null,
      imageBase64: 'AAAA',
      mimeType: 'image/jpeg',
    });
    expect(r.result.outcomeCode).toBe('config_missing');
    expect(r.attempts).toHaveLength(1);
    expect(r.attempts[0].tier).toBe('sonnet');
    expect(r.attempts[0].outcomeCode).toBe('config_missing');
  });
});

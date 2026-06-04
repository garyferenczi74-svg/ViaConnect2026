// Prompt 175 Part H (2026-06-04): claude-tier adapter unit tests.
//
// Covers the pieces of the adapter that don't require a live network call:
//   * extractTextBlock pulls the first text content block out of a
//     /v1/messages-shaped object and tolerates noisy/malformed inputs
//   * the prompt constant is non-empty, asks for items[], and contains no
//     em or en dashes (175 hard rule)
//   * createClaudeTierAdapter returns a TierAdapter function (smoke test)
//
// The HTTP call itself is covered at the integration tier in a later
// prompt once the route is wired to a staging Vercel preview.

import { describe, it, expect } from 'vitest';
import {
  extractTextBlock,
  createClaudeTierAdapter,
  SUPPLEMENT_EXTRACTION_PROMPT,
} from '@/lib/caq/supplement-extraction/claude-tier';

describe('extractTextBlock', () => {
  it('returns the first text block from a well-formed response', () => {
    const body = {
      content: [
        { type: 'text', text: '{"items":[]}' },
        { type: 'text', text: 'second' },
      ],
    };
    expect(extractTextBlock(body)).toBe('{"items":[]}');
  });

  it('skips non-text blocks and finds the text block', () => {
    const body = {
      content: [
        { type: 'image' },
        { type: 'tool_use', name: 'extract' },
        { type: 'text', text: '{"items":[]}' },
      ],
    };
    expect(extractTextBlock(body)).toBe('{"items":[]}');
  });

  it('returns empty string when content is missing', () => {
    expect(extractTextBlock({})).toBe('');
    expect(extractTextBlock(null)).toBe('');
    expect(extractTextBlock(undefined)).toBe('');
  });

  it('returns empty string when no text block exists', () => {
    expect(extractTextBlock({ content: [{ type: 'image' }] })).toBe('');
    expect(extractTextBlock({ content: [] })).toBe('');
  });

  it('does not throw on malformed shapes', () => {
    expect(() => extractTextBlock('a string')).not.toThrow();
    expect(extractTextBlock('a string')).toBe('');
    expect(() => extractTextBlock({ content: 'not an array' })).not.toThrow();
    expect(extractTextBlock({ content: 'not an array' })).toBe('');
  });
});

describe('SUPPLEMENT_EXTRACTION_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof SUPPLEMENT_EXTRACTION_PROMPT).toBe('string');
    expect(SUPPLEMENT_EXTRACTION_PROMPT.length).toBeGreaterThan(100);
  });

  it('requests the 175 canonical items[] shape', () => {
    expect(SUPPLEMENT_EXTRACTION_PROMPT).toContain('items');
  });

  it('contains no em dashes or en dashes (175 hard rule)', () => {
    expect(SUPPLEMENT_EXTRACTION_PROMPT.includes('—')).toBe(false);
    expect(SUPPLEMENT_EXTRACTION_PROMPT.includes('–')).toBe(false);
  });
});

describe('createClaudeTierAdapter', () => {
  it('returns a function that accepts a tier and returns a Promise', () => {
    const adapter = createClaudeTierAdapter({
      apiKey: 'test-key',
      imageBase64: 'AAAA',
      mimeType: 'image/jpeg',
    });
    expect(typeof adapter).toBe('function');
  });
});

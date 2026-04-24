import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { buildSchedulerDraft, computeContentHash, normalizeCaptionText } from '@/lib/marshall/scheduler/normalize';

// Mirror of src/lib/marshall/precheck/normalize.ts normalizeText. Kept
// literally here so the hash-parity test fails loudly if either side
// drifts.
function normalizeText_v121(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/\r\n?/g, '\n')
    .replace(/[​-‏﻿]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hash_v121(raw: string): string {
  return createHash('sha256').update(normalizeText_v121(raw), 'utf8').digest('hex');
}

describe('normalizeCaptionText', () => {
  it('NFKD normalizes precomposed diacritics', () => {
    const precomposed = 'café';
    const decomposed = 'café';
    expect(normalizeCaptionText(precomposed)).toBe(normalizeCaptionText(decomposed));
  });

  it('collapses CRLF to LF', () => {
    expect(normalizeCaptionText('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('strips zero-width characters', () => {
    expect(normalizeCaptionText('hello​world‍!')).toBe('helloworld!');
  });

  it('collapses tabs and repeated spaces', () => {
    expect(normalizeCaptionText('a\t\tb   c')).toBe('a b c');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeCaptionText('   padded   ')).toBe('padded');
  });

  it('collapses three or more newlines to double', () => {
    expect(normalizeCaptionText('a\n\n\n\nb')).toBe('a\n\nb');
  });
});

describe('computeContentHash: byte-parity with #121 normalize.ts', () => {
  const fixtures = [
    'FarmCeutica GENEX360 for methylation support.',
    'Check our new peptide stack:\r\n- BPC-157\n- TB-500',
    '   Leading\tand\ttrailing   ',
    'multilingual: café, naïve, résumé',
    'zero​width‍tricks',
  ];

  it.each(fixtures)('hash matches #121 normalize for: %s', (text) => {
    expect(computeContentHash(text)).toBe(hash_v121(text));
  });

  it('hashtags and mentions do not alter the hash', () => {
    const draftA = buildSchedulerDraft({
      source: 'buffer',
      externalId: 'ext1',
      practitionerId: 'p1',
      connectionId: 'c1',
      targetPlatforms: ['instagram'],
      scheduledAt: '2026-05-01T14:00:00Z',
      captionText: 'Same text.',
      hashtags: ['health'],
      mentionHandles: ['@clinic'],
      mediaAttachments: [],
      editedAt: '2026-04-24T12:00:00Z',
      rawPayload: {},
    });
    const draftB = buildSchedulerDraft({
      source: 'hootsuite',
      externalId: 'ext2',
      practitionerId: 'p1',
      connectionId: 'c2',
      targetPlatforms: ['facebook_page'],
      scheduledAt: '2026-05-02T09:00:00Z',
      captionText: 'Same text.',
      hashtags: ['wellness', 'farmceutica'],
      mentionHandles: [],
      mediaAttachments: [],
      editedAt: '2026-04-24T12:05:00Z',
      rawPayload: {},
    });
    expect(draftA.contentHashSha256).toBe(draftB.contentHashSha256);
  });
});

describe('buildSchedulerDraft', () => {
  it('lowercases + sorts + deduplicates hashtags and mentions', () => {
    const d = buildSchedulerDraft({
      source: 'buffer',
      externalId: 'x',
      practitionerId: 'p',
      connectionId: 'c',
      targetPlatforms: ['instagram'],
      scheduledAt: '2026-05-01T14:00:00Z',
      captionText: 'caption',
      hashtags: ['HEALTH', 'Wellness', 'health'],
      mentionHandles: ['@Clinic', '@clinic', '@Doctor'],
      mediaAttachments: [],
      editedAt: '2026-04-24T12:00:00Z',
      rawPayload: {},
    });
    expect(d.hashtags).toEqual(['health', 'wellness']);
    expect(d.mentionHandles).toEqual(['@clinic', '@doctor']);
  });

  it('sorts targetPlatforms for stable downstream comparison', () => {
    const d = buildSchedulerDraft({
      source: 'buffer',
      externalId: 'x',
      practitionerId: 'p',
      connectionId: 'c',
      targetPlatforms: ['instagram', 'facebook_page', 'threads'],
      scheduledAt: '2026-05-01T14:00:00Z',
      captionText: 'caption',
      editedAt: '2026-04-24T12:00:00Z',
      rawPayload: {},
    });
    expect(d.targetPlatforms).toEqual(['facebook_page', 'instagram', 'threads']);
  });

  it('preserves raw payload without mutation for debugging', () => {
    const raw = { foo: 'bar', baz: { qux: 1 } };
    const d = buildSchedulerDraft({
      source: 'buffer',
      externalId: 'x',
      practitionerId: 'p',
      connectionId: 'c',
      targetPlatforms: [],
      scheduledAt: '2026-05-01T14:00:00Z',
      captionText: '',
      editedAt: '2026-04-24T12:00:00Z',
      rawPayload: raw,
    });
    expect(d.rawPayload).toBe(raw);
  });
});

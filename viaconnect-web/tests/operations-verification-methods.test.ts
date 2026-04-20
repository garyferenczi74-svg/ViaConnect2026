// Prompt #102 Workstream A verification method tests.

import { describe, it, expect } from 'vitest';
import {
  extractMetaTagToken,
  generateVerificationToken,
  metaTagSnippet,
  verifyMetaTagToken,
} from '@/lib/verifiedChannels/verificationMethods/metaTag';
import {
  dnsRecordMatches,
  dnsRecordName,
  shouldRetryAfterPropagationWindow,
} from '@/lib/verifiedChannels/verificationMethods/dnsTxt';
import {
  buildOAuthAuthorizeUrl,
  nonceMatches,
  parseOAuthState,
} from '@/lib/verifiedChannels/verificationMethods/marketplaceOAuth';
import { validateManualUpload } from '@/lib/verifiedChannels/verificationMethods/manualUpload';
import {
  computeRatio,
  isSingleDayFlagged,
  shouldFlagChannelFromSustained,
  VOLUME_FLAG_CONSECUTIVE_DAYS,
  VOLUME_FLAG_RATIO_THRESHOLD,
} from '@/lib/verifiedChannels/volumeCheck';
import {
  channelGrantsVIPCoverage,
  VERIFICATION_METHODS_BY_CHANNEL_TYPE,
} from '@/lib/verifiedChannels/types';

describe('meta-tag verification', () => {
  it('generateVerificationToken is unique, VC-prefixed', () => {
    const a = generateVerificationToken();
    const b = generateVerificationToken();
    expect(a).toMatch(/^VC-[0-9a-f]{16}$/);
    expect(b).toMatch(/^VC-[0-9a-f]{16}$/);
    expect(a).not.toBe(b);
  });

  it('extracts token from meta tag in either attribute order', () => {
    const html1 = `<head><meta name="viaconnect-channel-verification" content="VC-abc123" /></head>`;
    const html2 = `<head><meta content="VC-abc123" name="viaconnect-channel-verification"/></head>`;
    expect(extractMetaTagToken(html1)).toBe('VC-abc123');
    expect(extractMetaTagToken(html2)).toBe('VC-abc123');
  });

  it('returns null when tag missing', () => {
    expect(extractMetaTagToken('<head></head>')).toBeNull();
  });

  it('constant-time compare rejects length mismatch', () => {
    expect(verifyMetaTagToken('VC-short', 'VC-abc123def456')).toBe(false);
  });

  it('constant-time compare accepts match', () => {
    expect(verifyMetaTagToken('VC-abc123', 'VC-abc123')).toBe(true);
  });

  it('metaTagSnippet is a stable copyable string', () => {
    expect(metaTagSnippet('VC-xyz'))
      .toBe('<meta name="viaconnect-channel-verification" content="VC-xyz" />');
  });
});

describe('DNS TXT verification', () => {
  it('strips scheme + www + trailing slash', () => {
    expect(dnsRecordName('https://www.example.com/')).toBe('_viaconnect-verification.example.com');
  });
  it('matches exact record value', () => {
    expect(dnsRecordMatches(['VC-abc123'], 'VC-abc123')).toBe(true);
  });
  it('matches quoted record value', () => {
    expect(dnsRecordMatches(['"VC-abc123"'], 'VC-abc123')).toBe(true);
  });
  it('rejects mismatch', () => {
    expect(dnsRecordMatches(['VC-other'], 'VC-abc123')).toBe(false);
  });
  it('retry window is open during 48h', () => {
    const start = new Date('2026-05-01T00:00:00Z');
    const within = new Date('2026-05-02T12:00:00Z');
    expect(shouldRetryAfterPropagationWindow(start, within)).toBe(true);
  });
  it('retry window closes after 48h', () => {
    const start = new Date('2026-05-01T00:00:00Z');
    const after = new Date('2026-05-03T01:00:00Z');
    expect(shouldRetryAfterPropagationWindow(start, after)).toBe(false);
  });
});

describe('OAuth verification', () => {
  it('builds Amazon authorize URL', () => {
    const url = buildOAuthAuthorizeUrl({
      marketplace: 'amazon', channelId: 'ch-1', clientId: 'cid', redirectUri: 'https://cb',
    }, 'nonce');
    expect(url.startsWith('https://sellercentral.amazon.com/')).toBe(true);
    expect(url).toContain('state=ch-1.nonce');
  });

  it('builds Shopify authorize URL with shop domain', () => {
    const url = buildOAuthAuthorizeUrl({
      marketplace: 'shopify', channelId: 'ch-1', clientId: 'cid',
      redirectUri: 'https://cb', shopDomain: 'example.myshopify.com',
    }, 'nonce');
    expect(url.startsWith('https://example.myshopify.com/admin/oauth/authorize')).toBe(true);
  });

  it('throws when Shopify missing shop domain', () => {
    expect(() => buildOAuthAuthorizeUrl({
      marketplace: 'shopify', channelId: 'ch-1', clientId: 'cid', redirectUri: 'https://cb',
    }, 'nonce')).toThrow();
  });

  it('parseOAuthState round-trips', () => {
    expect(parseOAuthState('ch-1.nonce-abc')).toEqual({ channelId: 'ch-1', nonce: 'nonce-abc' });
  });

  it('parseOAuthState rejects malformed', () => {
    expect(parseOAuthState('no-dot')).toBeNull();
    expect(parseOAuthState('trailing.')).toBeNull();
  });

  it('nonceMatches constant-time', () => {
    expect(nonceMatches('abc123', 'abc123')).toBe(true);
    expect(nonceMatches('abc123', 'abc124')).toBe(false);
    expect(nonceMatches('abc', 'abc123')).toBe(false);
  });
});

describe('manual upload validation', () => {
  it('accepts a single PDF', () => {
    expect(validateManualUpload([{ size: 1000, type: 'application/pdf' }])).toBeNull();
  });
  it('rejects too many files', () => {
    const six = Array(6).fill({ size: 100, type: 'image/png' });
    expect(validateManualUpload(six)).toBe('TOO_MANY_DOCUMENTS');
  });
  it('rejects over-10MB file', () => {
    expect(validateManualUpload([{ size: 11 * 1024 * 1024, type: 'image/png' }])).toBe('DOCUMENT_TOO_LARGE');
  });
  it('rejects unsupported mime', () => {
    expect(validateManualUpload([{ size: 100, type: 'application/x-evil' }])).toBe('UNSUPPORTED_MIME_TYPE');
  });
  it('rejects empty list', () => {
    expect(validateManualUpload([])).toBe('EMPTY_UPLOAD');
  });
});

describe('volume check', () => {
  it('ratio is retail / wholesale', () => {
    expect(computeRatio({ apparentRetailCents: 1000, wholesaleInventoryCents: 500 })).toBe(2);
  });
  it('ratio returns 0 when retail is 0', () => {
    expect(computeRatio({ apparentRetailCents: 0, wholesaleInventoryCents: 500 })).toBe(0);
  });
  it('ratio returns Infinity when wholesale is 0 but retail is positive', () => {
    expect(computeRatio({ apparentRetailCents: 100, wholesaleInventoryCents: 0 })).toBe(Infinity);
  });
  it('single-day flag triggered above 2.0', () => {
    expect(isSingleDayFlagged({ apparentRetailCents: 300, wholesaleInventoryCents: 100 })).toBe(true);
    expect(isSingleDayFlagged({ apparentRetailCents: 200, wholesaleInventoryCents: 100 })).toBe(false);
  });
  it('sustained flag requires 7 consecutive days above threshold', () => {
    expect(shouldFlagChannelFromSustained([3, 3, 3, 3, 3, 3, 3])).toBe(true);
    expect(shouldFlagChannelFromSustained([3, 3, 1, 3, 3, 3, 3])).toBe(false);
    expect(shouldFlagChannelFromSustained([3, 3, 3])).toBe(false); // too few
  });
  it('thresholds match spec', () => {
    expect(VOLUME_FLAG_RATIO_THRESHOLD).toBe(2.0);
    expect(VOLUME_FLAG_CONSECUTIVE_DAYS).toBe(7);
  });
});

describe('channel state → VIP coverage mapping (§4.1)', () => {
  it.each([
    ['pending_verification', false],
    ['verified', true],
    ['verification_lapsed', false],
    ['verification_failed', false],
    ['volume_flagged', false],
    ['suspended', false],
  ] as const)('state=%s grants VIP=%s', (state, expected) => {
    expect(channelGrantsVIPCoverage(state)).toBe(expected);
  });
});

describe('verification method matrix (§4.2)', () => {
  it('own_website offers meta-tag + DNS', () => {
    expect([...VERIFICATION_METHODS_BY_CHANNEL_TYPE.own_website]).toEqual([
      'domain_meta_tag', 'dns_txt_record',
    ]);
  });
  it('physical_clinic_pos offers manual upload only', () => {
    expect([...VERIFICATION_METHODS_BY_CHANNEL_TYPE.physical_clinic_pos]).toEqual([
      'manual_document_upload',
    ]);
  });
  it('shopify offers OAuth + meta-tag fallback', () => {
    expect([...VERIFICATION_METHODS_BY_CHANNEL_TYPE.shopify_store]).toEqual([
      'marketplace_oauth', 'domain_meta_tag',
    ]);
  });
});

// Prompt #101 Workstream C — VIP validation + public-listing-NOT-suppressed tests.

import { describe, it, expect } from 'vitest';
import {
  isCustomerSpecificUrl,
  validateCustomerIdentity,
  validateVIPConcurrency,
  validateVIPMargin,
  validateVIPWindow,
} from '@/lib/map/vip/validation';
import {
  MAX_CONCURRENT_ACTIVE_VIP_EXEMPTIONS_PER_PRACTITIONER,
  reasonRequiresEncryptedNote,
  VIP_EXEMPTION_MAX_WINDOW_DAYS,
  VIP_SENSITIVE_REASONS,
} from '@/lib/map/vip/types';

const DAY = 24 * 60 * 60 * 1000;

describe('validateCustomerIdentity', () => {
  it('requires one customer identity', () => {
    expect(validateCustomerIdentity(null, null)).toBe('VIP_CUSTOMER_REQUIRED');
  });
  it('rejects both set', () => {
    expect(validateCustomerIdentity('c-1', 'm-1')).toBe('VIP_CUSTOMER_CONFLICT');
  });
  it('client-only OK', () => {
    expect(validateCustomerIdentity('c-1', null)).toBeNull();
  });
  it('manual-only OK', () => {
    expect(validateCustomerIdentity(null, 'm-1')).toBeNull();
  });
});

describe('validateVIPWindow', () => {
  it('rejects negative duration', () => {
    expect(validateVIPWindow(new Date('2026-06-01'), new Date('2026-05-01'))).toBe('VIP_WINDOW_INVALID');
  });
  it('accepts 180 days exactly', () => {
    const start = new Date('2026-05-01');
    const end = new Date(start.getTime() + 180 * DAY);
    expect(validateVIPWindow(start, end)).toBeNull();
  });
  it('rejects 181 days', () => {
    const start = new Date('2026-05-01');
    const end = new Date(start.getTime() + 181 * DAY);
    expect(validateVIPWindow(start, end)).toBe('VIP_WINDOW_EXCEEDS_MAX');
  });
});

describe('validateVIPMargin', () => {
  it('rejects below floor', () => {
    expect(validateVIPMargin(171, 100)).toBe('VIP_MARGIN_BREACH');
  });
  it('accepts at floor', () => {
    expect(validateVIPMargin(172, 100)).toBeNull();
  });
});

describe('validateVIPConcurrency', () => {
  it('5th active exemption: accepted', () => {
    expect(validateVIPConcurrency(4)).toBeNull();
  });
  it('6th active exemption: rejected', () => {
    expect(validateVIPConcurrency(5)).toBe('VIP_CONCURRENCY_EXCEEDED');
  });
});

describe('isCustomerSpecificUrl', () => {
  it.each([
    'https://clinic.com/customer/abc-123',
    'https://clinic.com/patient/xyz_456',
    'https://store.com/member/abc',
    'https://site.com/vip/customer-1',
    'https://site.com/patient/abc/checkout',
  ])('recognises customer-pattern URL: %s', (url) => {
    expect(isCustomerSpecificUrl(url)).toBe(true);
  });

  it.each([
    'https://amazon.com/dp/B0CABC',
    'https://google.com/shopping/product/xyz',
    'https://shop.example.com/widget',
    'https://instagram.com/practitioner/',
    'https://ebay.com/itm/1234',
  ])('public commerce URL: %s', (url) => {
    expect(isCustomerSpecificUrl(url)).toBe(false);
  });
});

describe('VIP reasons + sensitive note requirement', () => {
  it('documented_financial_hardship requires encrypted note', () => {
    expect(reasonRequiresEncryptedNote('documented_financial_hardship')).toBe(true);
  });
  it('immediate_family does not require encrypted note', () => {
    expect(reasonRequiresEncryptedNote('immediate_family')).toBe(false);
  });
  it('VIP_SENSITIVE_REASONS is the authoritative list', () => {
    expect(VIP_SENSITIVE_REASONS.length).toBe(3);
  });
});

describe('VIP constants', () => {
  it('caps at 5 concurrent', () => {
    expect(MAX_CONCURRENT_ACTIVE_VIP_EXEMPTIONS_PER_PRACTITIONER).toBe(5);
  });
  it('max window is 180 days', () => {
    expect(VIP_EXEMPTION_MAX_WINDOW_DAYS).toBe(180);
  });
});

// Prompt #102: tax form validators + PII redaction + threshold tests.

import { describe, it, expect } from 'vitest';
import {
  validateT4A,
  validateW8BEN,
  validateW8BENE,
  validateW9,
} from '@/lib/tax/formValidators';
import {
  CA_T4A_THRESHOLD_CENTS,
  requiresYearEndDocument,
  reportingThresholdCents,
  US_1099_NEC_THRESHOLD_CENTS,
} from '@/lib/tax/thresholds';
import {
  redactAccountNumber,
  redactEIN,
  redactSSN,
  scrubStringForPII,
} from '@/lib/pii/redaction';

describe('W-9 validator', () => {
  const base = {
    legalName: 'Jane Doe', ssnOrEin: '123-45-6789', idKind: 'ssn' as const,
    addressLine1: '123 Main', city: 'Boulder', state: 'CO', zip: '80301',
  };
  it('accepts valid SSN W-9', () => {
    expect(validateW9(base)).toBeNull();
  });
  it('accepts valid EIN W-9', () => {
    expect(validateW9({ ...base, ssnOrEin: '12-3456789', idKind: 'ein' })).toBeNull();
  });
  it('rejects malformed SSN', () => {
    expect(validateW9({ ...base, ssnOrEin: '12345-6789' })).toBe('SSN_FORMAT_INVALID');
  });
  it('rejects malformed EIN', () => {
    expect(validateW9({ ...base, ssnOrEin: '123-456789', idKind: 'ein' })).toBe('EIN_FORMAT_INVALID');
  });
  it('rejects empty legal name', () => {
    expect(validateW9({ ...base, legalName: '' })).toBe('LEGAL_NAME_REQUIRED');
  });
});

describe('W-8BEN / W-8BEN-E', () => {
  it('accepts valid W-8BEN', () => {
    expect(validateW8BEN({
      legalName: 'Hiroshi Tanaka', foreignTaxId: 'JP-123-456-789',
      countryOfResidence: 'JP', permanentAddress: '1-2-3 Shibuya Tokyo',
    })).toBeNull();
  });
  it('rejects non-2-char country code', () => {
    expect(validateW8BEN({
      legalName: 'H T', foreignTaxId: 'JP-123-456',
      countryOfResidence: 'Japan', permanentAddress: '1-2-3 Shibuya Tokyo',
    })).toBe('COUNTRY_REQUIRED');
  });
  it('W-8BEN-E requires entity name', () => {
    expect(validateW8BENE({
      entityName: '', legalName: 'H T', foreignTaxId: 'JP-123-456-789',
      countryOfResidence: 'JP', permanentAddress: 'x',
    })).toBe('LEGAL_NAME_REQUIRED');
  });
});

describe('T4A validator', () => {
  const base = {
    legalName: 'Jean Tremblay', sinOrBn: '123-456-789', idKind: 'sin' as const,
    addressLine1: '100 Queen', city: 'Ottawa', province: 'ON', postalCode: 'K1A 0A1',
  };
  it('accepts valid SIN T4A', () => {
    expect(validateT4A(base)).toBeNull();
  });
  it('accepts valid BN T4A', () => {
    expect(validateT4A({ ...base, sinOrBn: '123456789RT0001', idKind: 'bn' })).toBeNull();
  });
  it('rejects malformed SIN', () => {
    expect(validateT4A({ ...base, sinOrBn: '1234567890' })).toBe('SIN_FORMAT_INVALID');
  });
});

describe('tax thresholds', () => {
  it('US 1099-NEC is $600', () => {
    expect(US_1099_NEC_THRESHOLD_CENTS).toBe(600_00);
  });
  it('CA T4A is $500', () => {
    expect(CA_T4A_THRESHOLD_CENTS).toBe(500_00);
  });
  it('other jurisdictions never trigger year-end doc', () => {
    expect(reportingThresholdCents('other')).toBe(Number.POSITIVE_INFINITY);
    expect(requiresYearEndDocument(1_000_000_00, 'other')).toBe(false);
  });
  it('US boundary at $600', () => {
    expect(requiresYearEndDocument(59999, 'US')).toBe(false);
    expect(requiresYearEndDocument(60000, 'US')).toBe(true);
  });
  it('CA boundary at $500', () => {
    expect(requiresYearEndDocument(49999, 'CA')).toBe(false);
    expect(requiresYearEndDocument(50000, 'CA')).toBe(true);
  });
});

describe('PII redaction', () => {
  it('redactSSN shows last 4', () => {
    expect(redactSSN('123-45-6789')).toBe('***-**-6789');
    expect(redactSSN('123456789')).toBe('***-**-6789');
  });
  it('redactSSN returns null on malformed', () => {
    expect(redactSSN('abc')).toBeNull();
  });
  it('redactEIN shows last 4', () => {
    expect(redactEIN('12-3456789')).toBe('**-***6789');
  });
  it('redactAccountNumber shows last 4', () => {
    expect(redactAccountNumber('0000012345678')).toBe('****5678');
    expect(redactAccountNumber('123')).toBeNull();
  });
  it('scrubStringForPII redacts SSN + EIN in free text', () => {
    const before = 'SSN 123-45-6789 and EIN 12-3456789 and card 4111-1111-1111-1111';
    const after = scrubStringForPII(before);
    expect(after).not.toContain('123-45-6789');
    expect(after).not.toContain('12-3456789');
    expect(after).not.toContain('4111-1111-1111-1111');
  });
});

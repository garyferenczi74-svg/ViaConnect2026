// Prompt 170l Phase 1c-4: tests for the GTIN check-digit validator.
//
// Covers all 4 supported formats (EAN-13 / UPC-A / EAN-8 / ITF-14), invalid
// checksums for each, wrong-length input (9-11 digits + 15+), non-numeric
// input, and the boundary cases.
//
// Reference values were computed via the GS1 algorithm (section 7.9 of
// General Specifications): weight from rightmost non-check digit with
// weights alternating 3, 1; sum mod 10; check = (10 - mod) mod 10.

import { describe, it, expect } from 'vitest';
import { validateBarcode } from '../checksum';

describe('validateBarcode', () => {
  describe('EAN-13 (13 digits)', () => {
    it('accepts a valid EAN-13', () => {
      const result = validateBarcode('0123456789012');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('EAN_13');
      expect(result.reason).toBeUndefined();
    });

    it('rejects EAN-13 with wrong check digit', () => {
      const result = validateBarcode('0123456789013');
      expect(result.valid).toBe(false);
      expect(result.format).toBeNull();
      expect(result.reason).toBe('checksum_mismatch');
    });

    it('accepts another valid EAN-13', () => {
      // 5901234123457 is a well-known GS1 documentation example.
      const result = validateBarcode('5901234123457');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('EAN_13');
    });
  });

  describe('UPC-A (12 digits)', () => {
    it('accepts a valid UPC-A', () => {
      const result = validateBarcode('012345678905');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('UPC_A');
    });

    it('rejects UPC-A with wrong check digit', () => {
      const result = validateBarcode('012345678906');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('checksum_mismatch');
    });

    it('accepts another valid UPC-A', () => {
      // 036000291452 is a real Quaker Chewy Granola Bar UPC-A.
      const result = validateBarcode('036000291452');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('UPC_A');
    });
  });

  describe('EAN-8 (8 digits)', () => {
    it('accepts a valid EAN-8', () => {
      const result = validateBarcode('12345670');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('EAN_8');
    });

    it('rejects EAN-8 with wrong check digit', () => {
      const result = validateBarcode('12345671');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('checksum_mismatch');
    });
  });

  describe('ITF-14 (14 digits)', () => {
    it('accepts a valid ITF-14', () => {
      const result = validateBarcode('01234567890128');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('ITF_14');
    });

    it('rejects ITF-14 with wrong check digit', () => {
      const result = validateBarcode('01234567890129');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('checksum_mismatch');
    });
  });

  describe('wrong length', () => {
    it.each([
      ['7 digits', '1234567'],
      ['9 digits', '123456789'],
      ['10 digits', '1234567890'],
      ['11 digits', '12345678901'],
      ['15 digits', '012345678901234'],
      ['empty string', ''],
    ])('rejects %s as wrong_length', (_label, input) => {
      const result = validateBarcode(input);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('wrong_length');
    });
  });

  describe('non-numeric input', () => {
    it('rejects strings containing letters', () => {
      const result = validateBarcode('012345A78905');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('non_numeric');
    });

    it('rejects strings containing whitespace inside', () => {
      const result = validateBarcode('012 345678905');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('non_numeric');
    });

    it('rejects strings containing punctuation', () => {
      const result = validateBarcode('012345-78905');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('non_numeric');
    });

    it('trims surrounding whitespace before validating', () => {
      const result = validateBarcode('  012345678905  ');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('UPC_A');
    });
  });

  describe('type-guard edge cases', () => {
    it('rejects non-string inputs gracefully', () => {
      // Cast via unknown to exercise the runtime guard without TS complaint.
      const result = validateBarcode(12345670 as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('non_numeric');
    });
  });
});

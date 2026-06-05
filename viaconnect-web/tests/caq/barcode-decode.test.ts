// Prompt 175d (2026-06-05): barcode decode regression tests.
//
// The decode path itself runs through html5-qrcode against a live video
// stream and cannot be exercised in vitest without a browser. The pieces
// covered here are the pure-logic guards that wrap the decoder:
//   * Codeage UPC-A 850049609517 fixture passes the GTIN check digit
//     and is classified as UPC_A
//   * SUPPLEMENT_BARCODE_FORMATS matches the spec 175d Section 2.3 set
//     (UPC_A, UPC_E, EAN_13, EAN_8, CODE_128, ITF) so html5-qrcode is
//     instructed to scan exactly those symbologies

import { describe, it, expect } from 'vitest';
import { validateBarcode } from '@/lib/nutrition/barcode/checksum';
import {
  HTML5_QRCODE_FORMATS,
  SUPPLEMENT_BARCODE_FORMATS,
} from '@/components/barcode/hooks/useBarcodeScan';

describe('Prompt 175d: barcode decode guards', () => {
  describe('Codeage UPC-A fixture', () => {
    it('850049609517 passes the GTIN check digit', () => {
      const result = validateBarcode('850049609517');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('UPC_A');
      expect(result.reason).toBeUndefined();
    });

    it('850049609518 (wrong check digit) is rejected', () => {
      const result = validateBarcode('850049609518');
      expect(result.valid).toBe(false);
      expect(result.format).toBeNull();
      expect(result.reason).toBe('checksum_mismatch');
    });
  });

  describe('SUPPLEMENT_BARCODE_FORMATS', () => {
    it('matches the spec 175d Section 2.3 symbology set', () => {
      const set = new Set(SUPPLEMENT_BARCODE_FORMATS);
      expect(set.has(HTML5_QRCODE_FORMATS.UPC_A)).toBe(true);
      expect(set.has(HTML5_QRCODE_FORMATS.UPC_E)).toBe(true);
      expect(set.has(HTML5_QRCODE_FORMATS.EAN_13)).toBe(true);
      expect(set.has(HTML5_QRCODE_FORMATS.EAN_8)).toBe(true);
      expect(set.has(HTML5_QRCODE_FORMATS.CODE_128)).toBe(true);
      expect(set.has(HTML5_QRCODE_FORMATS.ITF)).toBe(true);
    });

    it('excludes QR_CODE so html5-qrcode does not waste scan budget on QR', () => {
      const set = new Set(SUPPLEMENT_BARCODE_FORMATS);
      expect(set.has(HTML5_QRCODE_FORMATS.QR_CODE)).toBe(false);
    });

    it('has six entries (no duplicates, no extras)', () => {
      expect(new Set(SUPPLEMENT_BARCODE_FORMATS).size).toBe(6);
    });
  });

  describe('HTML5_QRCODE_FORMATS numeric ids', () => {
    it('matches the html5-qrcode 2.x Html5QrcodeSupportedFormats enum', () => {
      // Spot check against the stable enum values published in the
      // library's type declarations. Changing one of these would imply
      // the library upgraded to a version with a renumbered enum, which
      // is a manual-review-required event.
      expect(HTML5_QRCODE_FORMATS.UPC_A).toBe(14);
      expect(HTML5_QRCODE_FORMATS.EAN_13).toBe(11);
      expect(HTML5_QRCODE_FORMATS.CODE_128).toBe(5);
      expect(HTML5_QRCODE_FORMATS.ITF).toBe(13);
    });
  });
});

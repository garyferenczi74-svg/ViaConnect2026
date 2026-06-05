// Prompt 175d (2026-06-05): barcode decode regression tests.
// Prompt 175j (2026-06-05): updated for the html5-qrcode -> zxing-wasm swap.
//
// The decode path itself runs against a live video stream and cannot
// be exercised in vitest without a browser. The pieces covered here
// are the pure-logic guards that wrap the decoder:
//   * Codeage UPC-A 850049609517 fixture passes the GTIN check digit
//     and is classified as UPC_A
//   * SUPPLEMENT_BARCODE_FORMATS matches the spec 175d Section 2.3
//     symbology set in zxing-wasm canonical names
//   * HTML5_QRCODE_FORMATS retains its numeric values for backward
//     compatibility with any code or row in the database that captured
//     them historically

import { describe, it, expect } from 'vitest';
import { validateBarcode } from '@/lib/nutrition/barcode/checksum';
import {
  HTML5_QRCODE_FORMATS,
  SUPPLEMENT_BARCODE_FORMATS,
} from '@/components/barcode/hooks/useBarcodeScan';

describe('Prompt 175d + 175j: barcode decode guards', () => {
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

  describe('SUPPLEMENT_BARCODE_FORMATS (zxing-wasm canonical names)', () => {
    it('matches the spec 175d Section 2.3 symbology set', () => {
      const set = new Set(SUPPLEMENT_BARCODE_FORMATS);
      // zxing-wasm canonical names per node_modules/zxing-wasm
      // BARCODE_FORMATS list. These differ from html5-qrcode's
      // string set ('UPCA' vs 'UPC_A', 'EAN13' vs 'EAN_13', etc.).
      expect(set.has('UPCA')).toBe(true);
      expect(set.has('UPCE')).toBe(true);
      expect(set.has('EAN13')).toBe(true);
      expect(set.has('EAN8')).toBe(true);
      expect(set.has('Code128')).toBe(true);
      expect(set.has('ITF')).toBe(true);
    });

    it('excludes QRCode so the decoder does not waste budget on QR', () => {
      const set = new Set(SUPPLEMENT_BARCODE_FORMATS);
      expect(set.has('QRCode')).toBe(false);
    });

    it('has six entries (no duplicates, no extras)', () => {
      expect(new Set(SUPPLEMENT_BARCODE_FORMATS).size).toBe(6);
    });
  });

  describe('HTML5_QRCODE_FORMATS legacy numeric ids', () => {
    it('retains the historical html5-qrcode numeric values for back-compat', () => {
      // These constants are still exported from useBarcodeScan even
      // after the 175j swap. The numeric values are no longer fed to
      // any library; they are kept so older code and database rows
      // that captured them continue to typecheck.
      expect(HTML5_QRCODE_FORMATS.UPC_A).toBe(14);
      expect(HTML5_QRCODE_FORMATS.EAN_13).toBe(11);
      expect(HTML5_QRCODE_FORMATS.CODE_128).toBe(5);
      expect(HTML5_QRCODE_FORMATS.ITF).toBe(13);
    });
  });
});

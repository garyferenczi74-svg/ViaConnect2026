import { describe, it, expect } from 'vitest';
import {
  SCAN_SLOT_ACCEPT,
  SCAN_SLOT_HARD_MAX_BYTES,
  SCAN_SLOT_SOFT_MAX_BYTES,
  inspectScanSlotFile,
  isDirectScanImageType,
  isHeicLike,
  needsScanSlotReencode,
  openScanSlotPicker,
  takeScanSlotFile,
} from '../attachScanSlotPhoto';

function fakeFile(name: string, type: string, size: number): File {
  const buf = new Uint8Array(Math.min(size, 8));
  const file = new File([buf], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('attachScanSlotPhoto helpers', () => {
  it('accepts any image so iOS camera/library files are not silently dropped', () => {
    expect(SCAN_SLOT_ACCEPT).toBe('image/*');
    expect(SCAN_SLOT_ACCEPT).not.toContain('image/jpeg,image/png');
  });

  it('treats empty MIME (common iOS camera) as a direct still', () => {
    expect(isDirectScanImageType(fakeFile('image.jpg', '', 120_000))).toBe(true);
    expect(isDirectScanImageType(fakeFile('shot.jpeg', 'image/jpeg', 120_000))).toBe(true);
    expect(isHeicLike(fakeFile('IMG_0001.HEIC', 'image/heic', 2_000_000))).toBe(true);
    expect(isHeicLike(fakeFile('IMG_0001.heif', '', 2_000_000))).toBe(true);
  });

  it('does not hard-reject a typical iPhone still that is over 5 MB', () => {
    const phoneStill = fakeFile('IMG_1234.JPG', 'image/jpeg', 7_500_000);
    expect(inspectScanSlotFile(phoneStill)).toEqual({ ok: true });
    expect(needsScanSlotReencode(phoneStill)).toBe(true);
    expect(7_500_000).toBeGreaterThan(SCAN_SLOT_SOFT_MAX_BYTES);
    expect(7_500_000).toBeLessThan(SCAN_SLOT_HARD_MAX_BYTES);
  });

  it('rejects an empty or enormous file before the slot updates', () => {
    expect(inspectScanSlotFile(fakeFile('empty.jpg', 'image/jpeg', 0)).ok).toBe(false);
    expect(inspectScanSlotFile(fakeFile('huge.jpg', 'image/jpeg', SCAN_SLOT_HARD_MAX_BYTES + 1)).ok).toBe(false);
  });

  it('reads the first file and clears the input so a re-pick fires onChange', () => {
    const file = fakeFile('front.jpg', 'image/jpeg', 40_000);
    const input = {
      files: { 0: file, length: 1, item: () => file },
      value: 'C:\\fakepath\\front.jpg',
    } as unknown as HTMLInputElement;

    const taken = takeScanSlotFile(input);
    expect(taken).toBe(file);
    expect(input.value).toBe('');
    expect(takeScanSlotFile(null)).toBeNull();
  });

  it('opens the picker on a live input and no-ops a missing one', () => {
    let clicked = 0;
    const input = {
      value: 'C:\\fakepath\\front.jpg',
      click: () => {
        clicked += 1;
      },
    } as unknown as HTMLInputElement;

    expect(openScanSlotPicker(input)).toBe(true);
    expect(input.value).toBe('');
    expect(clicked).toBe(1);
    expect(openScanSlotPicker(null)).toBe(false);
  });
});

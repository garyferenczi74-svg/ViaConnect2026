// Shared attach helpers for the FormaVision 4-slot overlay (BodyScanUploader).
// Camera capture and the file-input fallback must both store the chosen blob
// on the pose slot. iOS often returns an empty MIME type and a file larger
// than 5 MB; a restrictive accept= list plus a hard size reject drops the
// photo before the slot ever updates.

export const SCAN_SLOT_ACCEPT = 'image/*';

/** Soft encode target. Larger camera stills are resized, not rejected. */
export const SCAN_SLOT_SOFT_MAX_BYTES = 5_000_000;

/** Hard ceiling so a video or huge RAW cannot enter the analyze payload. */
export const SCAN_SLOT_HARD_MAX_BYTES = 25_000_000;

export function isHeicLike(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

export function isDirectScanImageType(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  return (
    type === '' ||
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'image/webp'
  );
}

/**
 * Read the chosen file and clear the input so the same photo can be
 * re-selected (onChange does not fire when value is unchanged).
 */
export function takeScanSlotFile(input: HTMLInputElement | null): File | null {
  const file = input?.files?.[0] ?? null;
  if (input) input.value = '';
  return file;
}

export function inspectScanSlotFile(
  file: File,
): { ok: true } | { ok: false; error: string } {
  if (file.size <= 0) {
    return { ok: false, error: 'Could not read photo. Try a different image.' };
  }
  if (file.size > SCAN_SLOT_HARD_MAX_BYTES) {
    return { ok: false, error: 'Photo too large (max 25 MB). Try a smaller image.' };
  }
  return { ok: true };
}

export function needsScanSlotReencode(file: File): boolean {
  if (isHeicLike(file)) return true;
  if (file.size > SCAN_SLOT_SOFT_MAX_BYTES) return true;
  if (!isDirectScanImageType(file)) return true;
  return false;
}

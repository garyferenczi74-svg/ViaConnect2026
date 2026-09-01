// Arnold golden A-pose sets for Upload unify (2026-09-01).
// Body photos live on the shared box and are NOT committed.
//
// Two sets — both matter:
//   inverted: .../upload-test-2026-09-01/{01-front,...}.jpg
//     phone-gallery, visually 180°. Orientation-normalize fixture.
//   upright:  .../upload-test-2026-09-01/upright/{01-front,...}.jpg
//     Gary-corrected copies. Happy-path upload / analysis.

import { FORMAVISION_SLOT_ORDER, type PhotoPosition } from './formaVisionScanSlots';

export const FORMAVISION_GOLDEN_UPLOAD_DIR =
  '/workspace/formavision-review/upload-test-2026-09-01';

export const FORMAVISION_GOLDEN_UPRIGHT_DIR = `${FORMAVISION_GOLDEN_UPLOAD_DIR}/upright`;

export const FORMAVISION_GOLDEN_UPLOAD_FIXTURES: ReadonlyArray<{
  file: string;
  slot: PhotoPosition;
  label: 'Front' | 'Right' | 'Back' | 'Left';
}> = [
  { file: '01-front.jpg', slot: 'front', label: 'Front' },
  { file: '02-right.jpg', slot: 'right_side', label: 'Right' },
  { file: '03-back.jpg', slot: 'back', label: 'Back' },
  { file: '04-left.jpg', slot: 'left_side', label: 'Left' },
];

export type GoldenFixtureKind = 'inverted' | 'upright';

export function goldenUploadFixturePaths(
  dir: string = FORMAVISION_GOLDEN_UPLOAD_DIR,
): ReadonlyArray<{ path: string; slot: PhotoPosition; label: string; file: string }> {
  return FORMAVISION_GOLDEN_UPLOAD_FIXTURES.map((f) => ({
    ...f,
    path: `${dir.replace(/\/$/, '')}/${f.file}`,
  }));
}

export function goldenInvertedFixturePaths(): ReturnType<typeof goldenUploadFixturePaths> {
  return goldenUploadFixturePaths(FORMAVISION_GOLDEN_UPLOAD_DIR);
}

export function goldenUprightFixturePaths(): ReturnType<typeof goldenUploadFixturePaths> {
  return goldenUploadFixturePaths(FORMAVISION_GOLDEN_UPRIGHT_DIR);
}

/** Both sets are Front → Right → Back → Left — same order as live 4-pose. */
export function goldenUploadSlotsMatchScanOrder(): boolean {
  const golden = FORMAVISION_GOLDEN_UPLOAD_FIXTURES.map((f) => f.slot);
  const scan = FORMAVISION_SLOT_ORDER.map((s) => s.key);
  return golden.length === scan.length && golden.every((slot, i) => slot === scan[i]);
}

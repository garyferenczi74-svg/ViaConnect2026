// Deno mirror of src/lib/body-tracker/composition/scanMediaTypes.ts (Prompt 210l).
// PNG must be sent as image/png. Never default a PNG to image/jpeg.

export const PHOTO_POSITIONS = ['front', 'back', 'left_side', 'right_side'] as const;
export type ScanPhotoPosition = (typeof PHOTO_POSITIONS)[number];

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ScanMediaTypeMap = Record<ScanPhotoPosition, string>;

function normalizeDeclaredMediaType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'image/jpg') return 'image/jpeg';
  if (ALLOWED.has(t)) return t;
  return null;
}

export function resolveServerMediaTypes(body: {
  media_type?: string | null;
  media_types?: Partial<Record<ScanPhotoPosition, string>> | null;
}): { ok: true; mediaTypes: ScanMediaTypeMap } | { ok: false; error: string } {
  const perPhoto = body.media_types ?? null;
  const hasPerPhoto = perPhoto && PHOTO_POSITIONS.some((pos) => Boolean(perPhoto[pos]));

  if (hasPerPhoto) {
    const mediaTypes = {} as ScanMediaTypeMap;
    for (const pos of PHOTO_POSITIONS) {
      const resolved = normalizeDeclaredMediaType(perPhoto[pos]);
      if (!resolved) {
        return { ok: false, error: `unsupported media_type for ${pos}; allowed: image/jpeg, image/png, image/webp` };
      }
      mediaTypes[pos] = resolved;
    }
    return { ok: true, mediaTypes };
  }

  const single = normalizeDeclaredMediaType(body.media_type);
  if (!single) {
    if (!body.media_type) {
      return { ok: false, error: 'media_type required when photos use different types; do not default PNG to image/jpeg' };
    }
    return { ok: false, error: 'unsupported media_type; allowed: image/jpeg, image/png, image/webp' };
  }
  return {
    ok: true,
    mediaTypes: {
      front: single,
      back: single,
      left_side: single,
      right_side: single,
    },
  };
}

export function isBadVisionModel(status: number, errText: string): boolean {
  if (status === 404) return true;
  const t = errText.toLowerCase();
  return (
    t.includes('not_found_error') ||
    t.includes('invalid model') ||
    (t.includes('model') && t.includes('not_found')) ||
    t.includes('does not exist')
  );
}

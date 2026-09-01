// Prompt 210l: real image media types for body-scan-analyze.
// PNG must be sent as image/png. Never default a PNG (or unknown) to image/jpeg.

export const ALLOWED_SCAN_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedScanMediaType = (typeof ALLOWED_SCAN_MEDIA_TYPES)[number];

export const PHOTO_POSITIONS = ['front', 'back', 'left_side', 'right_side'] as const;
export type ScanPhotoPosition = (typeof PHOTO_POSITIONS)[number];

/** Client wall-clock budget for POST /functions/v1/body-scan-analyze. Matches VISION_TIMEOUT_MS (60s) plus slack. */
export const ANALYZE_CLIENT_TIMEOUT_MS = 65_000;

const ALLOWED = new Set<string>(ALLOWED_SCAN_MEDIA_TYPES);

export function normalizeDeclaredMediaType(raw: string | null | undefined): AllowedScanMediaType | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'image/jpg') return 'image/jpeg';
  if (ALLOWED.has(t)) return t as AllowedScanMediaType;
  return null;
}

/** Magic-byte sniff on the base64 body. Does not inspect pixel/PHI content beyond the header. */
export function detectMediaTypeFromBase64(base64: string | null | undefined): AllowedScanMediaType | null {
  if (!base64) return null;
  const head = base64.slice(0, 16);
  if (head.startsWith('iVBOR')) return 'image/png';
  if (head.startsWith('/9j/')) return 'image/jpeg';
  if (head.startsWith('UklGR') || head.startsWith('RIFF')) return 'image/webp';
  return null;
}

export function resolvePhotoMediaType(args: {
  declaredType?: string | null;
  base64?: string | null;
}): AllowedScanMediaType | null {
  return normalizeDeclaredMediaType(args.declaredType) ?? detectMediaTypeFromBase64(args.base64);
}

export type ScanMediaTypeMap = Record<ScanPhotoPosition, AllowedScanMediaType>;

export function resolveAllPhotoMediaTypes(
  slots: Record<ScanPhotoPosition, { fileType?: string | null; base64?: string | null }>,
): { ok: true; mediaTypes: ScanMediaTypeMap } | { ok: false; error: string; position: ScanPhotoPosition } {
  const mediaTypes = {} as ScanMediaTypeMap;
  for (const pos of PHOTO_POSITIONS) {
    const resolved = resolvePhotoMediaType({
      declaredType: slots[pos].fileType,
      base64: slots[pos].base64,
    });
    if (!resolved) {
      return {
        ok: false,
        position: pos,
        error: `${pos.replace('_', ' ')} photo must be JPEG, PNG, or WebP. HEIC is not supported.`,
      };
    }
    mediaTypes[pos] = resolved;
  }
  return { ok: true, mediaTypes };
}

export type PartialScanMediaTypeMap = Partial<ScanMediaTypeMap>;

export type PresentPhotoMediaResult =
  | { ok: true; mediaTypes: PartialScanMediaTypeMap; present: ScanPhotoPosition[] }
  | { ok: false; error: string; position?: ScanPhotoPosition };

/** Resolve media types for attached views only. Empty slots are skipped, never invented. */
export function resolvePresentPhotoMediaTypes(
  slots: Record<ScanPhotoPosition, { fileType?: string | null; base64?: string | null }>,
): PresentPhotoMediaResult {
  const mediaTypes: PartialScanMediaTypeMap = {};
  const present: ScanPhotoPosition[] = [];
  for (const pos of PHOTO_POSITIONS) {
    const base64 = slots[pos].base64;
    if (!base64) continue;
    const resolved = resolvePhotoMediaType({
      declaredType: slots[pos].fileType,
      base64,
    });
    if (!resolved) {
      return {
        ok: false,
        position: pos,
        error: `${pos.replace('_', ' ')} photo must be JPEG, PNG, or WebP. HEIC is not supported.`,
      };
    }
    mediaTypes[pos] = resolved;
    present.push(pos);
  }
  if (present.length === 0) {
    return {
      ok: false,
      error: 'Add at least one photo. Missing views are skipped, not invented.',
    };
  }
  return { ok: true, mediaTypes, present };
}

export function allMediaTypesMatch(mediaTypes: ScanMediaTypeMap): boolean {
  const first = mediaTypes.front;
  return PHOTO_POSITIONS.every((pos) => mediaTypes[pos] === first);
}

/** Client POST body. One media_type only when all four photos share a type; otherwise per-photo media_types. */
export function buildAnalyzeRequestMediaFields(mediaTypes: ScanMediaTypeMap): {
  media_type?: AllowedScanMediaType;
  media_types?: ScanMediaTypeMap;
} {
  if (allMediaTypesMatch(mediaTypes)) {
    return { media_type: mediaTypes.front };
  }
  return { media_types: mediaTypes };
}

/** Same as buildAnalyzeRequestMediaFields for a present-only (partial) map. */
export function buildPresentAnalyzeRequestMediaFields(mediaTypes: PartialScanMediaTypeMap): {
  media_type?: AllowedScanMediaType;
  media_types?: PartialScanMediaTypeMap;
} {
  const values = PHOTO_POSITIONS
    .map((pos) => mediaTypes[pos])
    .filter((v): v is AllowedScanMediaType => Boolean(v));
  if (values.length === 0) return {};
  const first = values[0];
  if (values.every((v) => v === first)) {
    return { media_type: first };
  }
  return { media_types: mediaTypes };
}

export function resolveServerMediaTypes(
  body: {
    media_type?: string | null;
    media_types?: Partial<Record<ScanPhotoPosition, string>> | null;
  },
  present?: readonly ScanPhotoPosition[],
): { ok: true; mediaTypes: ScanMediaTypeMap } | { ok: false; error: string } {
  const required = present && present.length > 0 ? present : PHOTO_POSITIONS;
  const perPhoto = body.media_types ?? null;
  const hasPerPhoto = perPhoto && required.some((pos) => Boolean(perPhoto[pos]));

  if (hasPerPhoto) {
    const mediaTypes = {} as ScanMediaTypeMap;
    for (const pos of required) {
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

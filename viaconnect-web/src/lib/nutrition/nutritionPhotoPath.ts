/**
 * Prompt 228 D2 security: resolve nutrition-photos object keys and enforce
 * owner-folder prefix before any service-role storage.remove.
 */

export const NUTRITION_PHOTO_BUCKET = 'nutrition-photos';

/** Parse a stored photo_url into a bucket-relative object key. */
export function storagePathFromPhotoUrl(photoUrl: string): string | null {
  const raw = photoUrl.trim();
  if (!raw) return null;
  // Stored as relative path userId/ym/file.ext in analyze-photo
  if (!raw.includes('://')) return raw.replace(/^\//, '');
  try {
    const u = new URL(raw);
    const marker = `/${NUTRITION_PHOTO_BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(u.pathname.slice(idx + marker.length));
    }
    const parts = u.pathname.split('/').filter(Boolean);
    const bi = parts.findIndex((p) => p === NUTRITION_PHOTO_BUCKET);
    if (bi >= 0 && bi < parts.length - 1) {
      return decodeURIComponent(parts.slice(bi + 1).join('/'));
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Only allow removes under `${userId}/...`. Rejects empty, traversal (`..`),
 * absolute, or cross-user keys. Required before admin storage.remove.
 */
export function ownedNutritionPhotoPath(
  userId: string,
  storagePath: string | null | undefined,
): string | null {
  if (!userId || !storagePath) return null;
  const path = storagePath.trim().replace(/^\/+/, '');
  if (!path) return null;
  if (path.includes('..') || path.includes('\\')) return null;
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return null;
  if (path.length <= prefix.length) return null;
  return path;
}

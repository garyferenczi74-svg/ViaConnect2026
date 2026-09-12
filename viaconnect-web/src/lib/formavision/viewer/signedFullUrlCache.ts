import type { PoseId } from '@/lib/scan/poses';

const cache = new Map<string, string>();
const generationBySession = new Map<string, number>();

export function signedFullUrlCacheKey(sessionId: string, view: PoseId): string {
  return `${sessionId}:${view}`;
}

export function signedFullUrlGeneration(sessionId: string): number {
  return generationBySession.get(sessionId) ?? 0;
}

export function getCachedSignedFullUrl(
  sessionId: string,
  view: PoseId,
): string | null {
  return cache.get(signedFullUrlCacheKey(sessionId, view)) ?? null;
}

export function setCachedSignedFullUrl(
  sessionId: string,
  view: PoseId,
  url: string,
  generation?: number,
): boolean {
  if (
    generation !== undefined &&
    generation !== signedFullUrlGeneration(sessionId)
  ) {
    return false;
  }
  if (typeof url !== 'string' || url.length === 0) return false;
  cache.set(signedFullUrlCacheKey(sessionId, view), url);
  return true;
}

/** Drop cached Ready full URLs so a discarded session cannot flash a stale img. */
export function invalidateSignedFullUrlsForSession(sessionId: string): void {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return;
  generationBySession.set(sessionId, signedFullUrlGeneration(sessionId) + 1);
  const prefix = `${sessionId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function invalidateSignedFullUrlsForScan(input: {
  id: string;
  frblSessionId?: string | null;
}): void {
  invalidateSignedFullUrlsForSession(input.id);
  if (
    typeof input.frblSessionId === 'string' &&
    input.frblSessionId.length > 0 &&
    input.frblSessionId !== input.id
  ) {
    invalidateSignedFullUrlsForSession(input.frblSessionId);
  }
}

export function resetSignedFullUrlCacheForTests(): void {
  cache.clear();
  generationBySession.clear();
}

export async function fetchSignedFullUrl(
  sessionId: string,
  view: PoseId,
  signal?: AbortSignal,
): Promise<string | null> {
  const cached = getCachedSignedFullUrl(sessionId, view);
  if (cached) return cached;
  const generation = signedFullUrlGeneration(sessionId);
  const res = await fetch('/api/scan/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, view, variant: 'full' }),
    signal,
  });
  const body = (await res.json().catch(() => null)) as {
    ok?: boolean;
    signedUrl?: string;
  } | null;
  if (!res.ok || body?.ok !== true || typeof body.signedUrl !== 'string') {
    return null;
  }
  setCachedSignedFullUrl(sessionId, view, body.signedUrl, generation);
  return getCachedSignedFullUrl(sessionId, view) ?? body.signedUrl;
}

/**
 * Brief 65: same-origin bytes for processSilhouette. Do not fetch the
 * Storage signed URL in the browser — that canvas can CORS-taint
 * selfie segmentation. Fail returns null (honesty; plate stays Wireframe).
 */
export async function fetchSignedFullBlob(
  sessionId: string,
  view: PoseId,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const res = await fetch('/api/scan/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      view,
      variant: 'full',
      delivery: 'blob',
    }),
    signal,
  });
  if (!res.ok) return null;
  const delivery = res.headers.get('X-ViaConnect-Scan-Delivery');
  const contentType = (res.headers.get('Content-Type') ?? '').split(';')[0].trim();
  // H2: Photo JSON signedUrl must never be treated as Ready Wireframe bytes.
  if (contentType === 'application/json') return null;
  if (delivery !== 'blob' && !contentType.startsWith('image/')) {
    return null;
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) return null;
  return blob;
}

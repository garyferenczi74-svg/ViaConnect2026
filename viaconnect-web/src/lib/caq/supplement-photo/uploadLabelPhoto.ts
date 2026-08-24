/**
 * Prompt 219b: client helper to upload a compressed label photo to the
 * private user-supplement-label-photos bucket via the server route.
 * Fail-open: returns retryable result; caller keeps the local blob.
 */

export type LabelPhotoUploadResult =
  | {
      ok: true;
      bucket: string;
      path: string;
      signedUrl: string | null;
    }
  | {
      ok: false;
      retryable: boolean;
      error: string;
    };

const CLIENT_TIMEOUT_MS = 25_000;

export async function uploadLabelPhoto(
  file: Blob,
  mimeType: string,
): Promise<LabelPhotoUploadResult> {
  const form = new FormData();
  const name =
    mimeType === 'image/png'
      ? 'label.png'
      : mimeType === 'image/webp'
        ? 'label.webp'
        : 'label.jpg';
  form.append('file', file, name);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/supplements/label-photo/upload', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const raw = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      data = null;
    }
    if (!data) {
      return {
        ok: false,
        retryable: true,
        error: 'Upload did not complete. Your photo is still on this device.',
      };
    }
    if (data.success === true && typeof data.path === 'string') {
      return {
        ok: true,
        bucket: typeof data.bucket === 'string' ? data.bucket : 'user-supplement-label-photos',
        path: data.path,
        signedUrl: typeof data.signedUrl === 'string' ? data.signedUrl : null,
      };
    }
    return {
      ok: false,
      retryable: data.retryable !== false,
      error:
        typeof data.error === 'string'
          ? data.error
          : 'Upload failed. Your photo is still on this device.',
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      retryable: true,
      error: aborted
        ? 'Upload timed out. Your photo is still on this device. Retry when ready.'
        : 'Network error during upload. Your photo is still on this device.',
    };
  } finally {
    clearTimeout(timer);
  }
}

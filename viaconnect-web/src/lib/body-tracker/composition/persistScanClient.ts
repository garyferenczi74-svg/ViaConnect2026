// Client-side helper that calls the scan persist route.
// Never throws: any network error or non-ok status is returned as { ok:false, reason }.
// Used by BodyScanUploader after the edge function returns scan results.

export async function persistScan(
  scanId: string
): Promise<{ ok: boolean; entryId?: string; reason?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/api/body/scan/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }

    const data = (await res.json()) as { ok: boolean; entryId?: string; reason?: string };
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

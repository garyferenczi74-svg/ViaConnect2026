// Client-side helper that calls the scan persist route.
// Never throws: any network error or non-ok status is returned as { ok:false, reason }.
// Used by BodyScanUploader after the edge function returns scan results.

export async function persistScan(
  scanId: string
): Promise<{ ok: boolean; entryId?: string; reason?: string }> {
  try {
    const res = await fetch('/api/body/scan/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId }),
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }

    const data = (await res.json()) as { ok: boolean; entryId?: string; reason?: string };
    return data;
  } catch {
    return { ok: false, reason: 'network' };
  }
}

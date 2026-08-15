// Client-side helper that calls the scan persist route.
// Never throws: any network error or non-ok status is returned as { ok:false, reason }.
//
// Prompt 210l: scan path timeout raised to 45s. The persist route chains several
// 5s-bounded Supabase calls; a 5s client abort was fail-opening before the
// body_tracker_entries row committed, so FormaVision never saw the scan.
// Other callers must not use this for non-scan work; this helper is scan-only.

/** Scan persist client wall-clock budget (ms). Scan path only. */
export const SCAN_PERSIST_CLIENT_TIMEOUT_MS = 45_000;

export async function persistScan(
  scanId: string,
): Promise<{ ok: boolean; entryId?: string; reason?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_PERSIST_CLIENT_TIMEOUT_MS);
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

    const data = (await res.json()) as {
      ok: boolean;
      entryId?: string;
      reason?: string;
    };
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

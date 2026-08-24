// Human-readable FormaVision estimate note. Timeline shows this string as-is.
// Midpoint is not written here; callers that need a single number use metadata.

const RANGE_RE = /FormaVision estimate:\s*(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)%/i;

export function formatFormaVisionEstimateNote(min: number, max: number): string {
  const a = Math.round(min * 10) / 10;
  const b = Math.round(max * 10) / 10;
  return `FormaVision estimate: ${a.toFixed(1)}–${b.toFixed(1)}% body fat`;
}

export function parseFormaVisionEstimateNote(
  notes: string | null | undefined,
): { min: number; max: number } | null {
  if (!notes) return null;
  const m = notes.match(RANGE_RE);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

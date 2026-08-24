/**
 * Prompt 210l: shared spine contract between scan persist write and
 * FormaVision / composition readers. One source of truth for the fields
 * the renderer and fat/muscle tabs depend on so the surface split cannot
 * desynchronize silently again.
 *
 * This is a contract assertion module, not a math rewrite of the 209 engine.
 */

import type { CompositionSnapshot } from './types';
import type { CircumferenceMeasurements } from '@/lib/body-tracker/circumference';

/** Fields composition persist must be able to produce for a completed scan. */
export interface ScanSpineWriteContract {
  entryId: string;
  source: 'scan' | 'manual';
  totalBodyFatPct: number | null;
  /** True when at least one girth is present for 3D personalization. */
  hasAnyCircumference: boolean;
}

/** Fields FormaVision reads to decide empty vs render. */
export interface ScanSpineReadContract {
  snapshot: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
}

export function hasRenderableSpine(read: ScanSpineReadContract): boolean {
  return Boolean(read.snapshot || read.circumferences);
}

export function anyCircumferencePresent(
  c: CircumferenceMeasurements | null | undefined,
): boolean {
  if (!c) return false;
  return Object.values(c).some((v) => typeof v === 'number' && Number.isFinite(v));
}

/**
 * Assert write and read views of the spine agree on "something landed".
 * Used by unit tests; never fabricates values.
 */
export function assertScanSpineContract(args: {
  write: ScanSpineWriteContract;
  read: ScanSpineReadContract;
}): { ok: true } | { ok: false; reason: string } {
  if (!args.write.entryId) {
    return { ok: false, reason: 'write_missing_entry_id' };
  }
  if (!args.read.snapshot && !args.read.circumferences) {
    return { ok: false, reason: 'read_empty_after_write' };
  }
  if (args.read.snapshot && args.read.snapshot.entryId !== args.write.entryId) {
    // History may show a different latest entry; only hard-fail when write
    // claimed fat and read has a mismatched non-null snapshot entry.
    if (args.write.totalBodyFatPct !== null && args.read.snapshot.totalBodyFatPct === null) {
      return { ok: false, reason: 'read_missing_fat_after_write' };
    }
  }
  if (args.write.hasAnyCircumference && !anyCircumferencePresent(args.read.circumferences)) {
    return { ok: false, reason: 'read_missing_girths_after_write' };
  }
  return { ok: true };
}

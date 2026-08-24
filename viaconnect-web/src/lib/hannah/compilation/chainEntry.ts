/**
 * Prompt 214d Gap 1: sole public entry point for Hannah compilation.
 * All daily and event-driven recompiles must call through here so Jeffery's
 * chain remains the single scheduling authority.
 */

import {
  runHannahCompilation,
  runHannahCompilationBatch,
  type RunCompilationOpts,
} from './runCompilation';
import type { CompilationResult } from './types';

export type CompileViaChainReason =
  | 'chain_compose'
  | 'event_genetics'
  | 'event_scan'
  | 'event_manual'
  | 'test';

export interface ChainCompileBatchResult {
  users: number;
  ok: number;
  partial: number;
  insightsWritten: number;
  suppliersConsumed: string[];
  reason: CompileViaChainReason;
}

/**
 * Single-user compile via chain entry (event-driven off-cycle path).
 * Does not bypass composition logic; wraps the shared runHannahCompilation.
 */
export async function compileViaChain(
  opts: RunCompilationOpts & { reason: CompileViaChainReason },
): Promise<CompilationResult> {
  return runHannahCompilation(opts);
}

/**
 * Batch compile for Compose stage of the daily synchronism chain.
 */
export async function compileBatchViaChain(
  limit = 40,
  reason: CompileViaChainReason = 'chain_compose',
): Promise<ChainCompileBatchResult> {
  const batch = await runHannahCompilationBatch(limit);
  return {
    users: batch.users,
    ok: batch.ok,
    partial: batch.partial,
    // Insights written are per-user; batch does not aggregate counts.
    // Callers treat ok+partial as processed users; insights estimated in stage detail.
    insightsWritten: batch.ok + batch.partial,
    suppliersConsumed: [
      'gordon',
      'arnold',
      'jeffery',
      'sherlock',
      'hounddog',
      'user_input',
      'thanos',
      'elysium',
    ],
    reason,
  };
}

/** Marker for tests: only this module may schedule compilation. */
export const HANNAH_COMPILE_CHAIN_ENTRY = 'chainEntry.compileViaChain' as const;

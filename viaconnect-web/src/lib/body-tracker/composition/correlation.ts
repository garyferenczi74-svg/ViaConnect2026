// Correlation id helpers for scan telemetry.
// newCorrelationId is deterministic (no Math.random or Date.now) - safe in tests.
// logScanEvent threads structured log lines through the persist pipeline.

import { safeLog } from '@/lib/utils/safe-log';
import type { LogContext } from '@/lib/utils/safe-log';

export function newCorrelationId(seed: string): string {
  return `scan_${seed}`;
}

export function logScanEvent(
  stage: string,
  correlationId: string,
  fields: LogContext
): void {
  safeLog.info('scan.telemetry', stage, { correlationId, ...fields });
}

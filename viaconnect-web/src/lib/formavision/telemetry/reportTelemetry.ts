/**
 * src/lib/formavision/telemetry/reportTelemetry.ts
 *
 * Prompt 211a Workstream 3: telemetry for the doctor-ready scan report surface.
 *
 * Mirrors the avatarTelemetry emit pattern (same analytics_events sink, same
 * fail-open discipline): a telemetry failure MUST NOT propagate to the UI, and
 * payloads carry coarse, PII-clean fields only.
 *
 * Two events:
 *   - report_generated : emitted when a report PDF is produced (signed URL back).
 *   - report_shared    : emitted when the user shares or downloads the report.
 *
 * PII rule: the ONLY properties allowed are coarse flags (surface, channel,
 * ok). No name, no email, no signed URL, no storage path, no measurements.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any.
 */

import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import type { Json } from '@/lib/supabase/types';

export type ReportTelemetryEvent =
  | 'formavision.report_generated'
  | 'formavision.report_shared';

export const ALL_REPORT_EVENTS: ReportTelemetryEvent[] = [
  'formavision.report_generated',
  'formavision.report_shared',
];

// Coarse, serializable, PII-clean properties. channel distinguishes the export
// route (native share vs download) so the two-tap Gate can be measured.
export type ReportShareChannel = 'native_share' | 'download';

export interface ReportEventProperties {
  /** the surface the report was triggered from (coarse route id). */
  surface?: string;
  /** how the artifact left the app. */
  channel?: ReportShareChannel;
  /** whether the underlying action succeeded. */
  ok?: boolean;
}

const DEFAULT_SURFACE = '/body-tracker/composition';

/**
 * Builds the analytics_events insert payload (minus user_id). Pure: no Date.now,
 * no supabase, no side effects. properties is a plain Record<string, Json> so it
 * is assignable to the analytics_events properties column without a cast.
 */
export function buildReportEventPayload(
  event: ReportTelemetryEvent,
  properties: ReportEventProperties = {},
): { event: ReportTelemetryEvent; properties: Record<string, Json>; page: string } {
  const clean: Record<string, Json> = {};
  if (properties.surface !== undefined) clean.surface = properties.surface;
  if (properties.channel !== undefined) clean.channel = properties.channel;
  if (properties.ok !== undefined) clean.ok = properties.ok;
  return {
    event,
    properties: clean,
    page: properties.surface ?? DEFAULT_SURFACE,
  };
}

/**
 * Emits one report telemetry event to analytics_events. Fail-open: returns
 * immediately when userId is falsy, and never rejects on a supabase failure
 * (logs a warn via safeLog instead). Fire-and-forget usage is intentional.
 */
export async function emitReportEvent(
  userId: string | null | undefined,
  event: ReportTelemetryEvent,
  properties: ReportEventProperties = {},
): Promise<void> {
  if (!userId) return;
  const payload = { ...buildReportEventPayload(event, properties), user_id: userId };
  try {
    await createClient().from('analytics_events').insert(payload);
  } catch (e) {
    safeLog.warn('formavision.report-telemetry', 'report event emit failed', {
      event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

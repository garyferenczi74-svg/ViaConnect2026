// Prompt Brief 2: telemetry for the FormaVision 3D A/B compare surface.
//
// Mirrors clip/report telemetry: analytics_events sink, fail-open, coarse
// PII-clean fields only. Does NOT expand the 12-event avatar catalog.
//
// Standing rules: no em dashes, no en dashes, no emojis, zero any.

import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import type { Json } from '@/lib/supabase/types';
import type { AbBaselineKind } from './resolveAbBaseline';

export type CompareTelemetryEvent = 'formavision.ab_compared';

export const ALL_COMPARE_EVENTS: CompareTelemetryEvent[] = ['formavision.ab_compared'];

export interface CompareEventProperties {
  surface?: string;
  baseline?: AbBaselineKind;
  ok?: boolean;
}

const DEFAULT_SURFACE = '/body-tracker/formavision';

export function buildCompareEventPayload(
  event: CompareTelemetryEvent,
  properties: CompareEventProperties = {},
): { event: CompareTelemetryEvent; properties: Record<string, Json>; page: string } {
  const clean: Record<string, Json> = {};
  if (properties.surface !== undefined) clean.surface = properties.surface;
  if (properties.baseline !== undefined) clean.baseline = properties.baseline;
  if (properties.ok !== undefined) clean.ok = properties.ok;
  return {
    event,
    properties: clean,
    page: properties.surface ?? DEFAULT_SURFACE,
  };
}

export async function emitCompareEvent(
  userId: string | null | undefined,
  event: CompareTelemetryEvent,
  properties: CompareEventProperties = {},
): Promise<void> {
  if (!userId) return;
  const payload = { ...buildCompareEventPayload(event, properties), user_id: userId };
  try {
    await createClient().from('analytics_events').insert(payload);
  } catch (e) {
    safeLog.warn('formavision.compare-telemetry', 'compare event emit failed', {
      event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

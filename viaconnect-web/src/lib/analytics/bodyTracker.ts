// Prompt #157k §2.7: body-tracker hover-system analytics events.
// Event payload includes region_id, view (composition / muscle),
// gender (male / female), viewport (mobile / tablet / desktop), and
// trigger_source (figure / legend / keyboard). Dispatch is a thin
// console.debug in development and a no-op in production by default;
// the project's real analytics pipeline can swap in here later
// without changing call sites.

export const BODY_TRACKER_EVENTS = {
  REGION_PEEK:      'body_tracker.region_peek',
  REGION_PIN:       'body_tracker.region_pin',
  REGION_EVICT:     'body_tracker.region_evict',
  REGION_REPLACE:   'body_tracker.region_replace',
  REGION_UNPIN:     'body_tracker.region_unpin',
  REGION_CLEAR_ALL: 'body_tracker.region_clear_all',
} as const;

export type BodyTrackerEventName =
  (typeof BODY_TRACKER_EVENTS)[keyof typeof BODY_TRACKER_EVENTS];

export type BodyTrackerViewport = 'mobile' | 'tablet' | 'desktop';

export interface BodyTrackerEventPayload {
  readonly region_id?: string;
  readonly evicted_region_id?: string;
  readonly replaced_region_id?: string;
  readonly view: 'composition' | 'muscle';
  readonly gender: 'male' | 'female';
  readonly viewport: BodyTrackerViewport;
  readonly trigger_source: 'figure' | 'legend' | 'keyboard';
}

export function trackBodyTrackerEvent(
  name: BodyTrackerEventName,
  payload: BodyTrackerEventPayload,
): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(`[bodyTracker] ${name}`, payload);
  }
}

export function getViewportTag(): BodyTrackerViewport {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

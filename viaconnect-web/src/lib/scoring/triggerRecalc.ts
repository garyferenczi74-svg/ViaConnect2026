// Event → gauge trigger map (Prompt #62e).
//
// Maps data events to the gauges they affect. Used by the score
// recalculation pipeline to avoid full 8-gauge recalcs on every event.

import type { GaugeId } from './dailyScoreEngine';

export const TRIGGER_MAP: Record<string, GaugeId[]> = {
  // Automatic data syncs
  'wearable.sleep_sync':         ['sleep', 'recovery'],
  'wearable.workout_sync':       ['exercise'],
  'wearable.steps_sync':         ['steps'],
  'wearable.hrv_sync':           ['stress', 'recovery'],

  // User actions in ViaConnect
  'protocol.supplement_checkin': ['supplements', 'nutrition'],
  'meal.logged':                 ['nutrition'],
  'checkin.completed':           ['sleep', 'exercise', 'steps', 'stress', 'recovery'],

  // System events
  'cron.midnight':               ['streak'],
  'cron.6am':                    ['sleep', 'exercise', 'steps', 'stress', 'recovery', 'streak', 'supplements', 'nutrition'],
};

export function getAffectedGauges(eventType: string): GaugeId[] {
  return TRIGGER_MAP[eventType] ?? [];
}

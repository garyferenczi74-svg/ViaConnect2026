// Contextual engagement nudges (Prompt #62d).
//
// Pure: given gauge state + time of day, return the highest-priority
// nudge to surface in the EngagementNudge card. Used by the consumer
// dashboard and (later) by the AI advisor to seed conversations.

import type { GaugeId } from './dailyScoreEngine';

export type NudgeIconName =
  | 'Brain'
  | 'Bed'
  | 'Activity'
  | 'Pill'
  | 'Apple'
  | 'Flame'
  | 'Sparkles';

export interface EngagementNudge {
  iconName: NudgeIconName;
  message: string;
  pointsReward: string;
  /** Higher = more urgent. */
  priority: number;
}

export interface GaugeSnapshot {
  id: GaugeId;
  score: number;
}

export interface GenerateNudgeInput {
  snapshots: GaugeSnapshot[];
  currentStreak: number;
  /** Local hour 0-23 — used for late-evening streak warnings. */
  hourOfDay: number;
}

export function generateNudges(input: GenerateNudgeInput): EngagementNudge[] {
  const { snapshots, currentStreak, hourOfDay } = input;
  const byId = Object.fromEntries(
    snapshots.map((s) => [s.id, s.score]),
  ) as Record<GaugeId, number | undefined>;

  const nudges: EngagementNudge[] = [];

  // Streak about to break — late evening, no activity today
  if (hourOfDay >= 22 && currentStreak >= 3 && (byId.streak ?? 0) < 50) {
    nudges.push({
      iconName: 'Flame',
      message: `Your ${currentStreak}-day streak is on the line — any dashboard action keeps it alive.`,
      pointsReward: 'Streak save',
      priority: 100,
    });
  }

  // Perfect Day in sight (highest non-urgent priority)
  const above75 = snapshots.filter((s) => s.score >= 75);
  if (above75.length >= 6 && above75.length < 8) {
    const remaining = snapshots
      .filter((s) => s.score < 75)
      .map((s) => s.id)
      .join(' and ');
    nudges.push({
      iconName: 'Sparkles',
      message: `Perfect Day in reach — only ${remaining} to go (worth 250 pts).`,
      pointsReward: 'All 8 gauges above 75',
      priority: 90,
    });
  }

  if ((byId.sleep ?? 100) < 50) {
    nudges.push({
      iconName: 'Bed',
      message: 'Your sleep score is low. Try a consistent bedtime — even 30 minutes earlier helps.',
      pointsReward: '+10 pts for logging tonight',
      priority: 70,
    });
  }

  if ((byId.supplements ?? 0) > 0 && (byId.supplements ?? 0) < 100) {
    nudges.push({
      iconName: 'Pill',
      message: "Finish today's supplement protocol to lock in full credit.",
      pointsReward: '+30 pts for 100% adherence',
      priority: 65,
    });
  }

  if ((byId.exercise ?? 100) < 25) {
    nudges.push({
      iconName: 'Activity',
      message: 'No exercise logged yet. A 15-minute walk gets you to 50.',
      pointsReward: '+10 pts for any workout',
      priority: 60,
    });
  }

  if ((byId.nutrition ?? 100) < 40) {
    nudges.push({
      iconName: 'Apple',
      message: 'Your nutrition score could use a boost. Log a meal to improve it.',
      pointsReward: '+10 pts for meal logging',
      priority: 55,
    });
  }

  if (nudges.length === 0) {
    nudges.push({
      iconName: 'Brain',
      message: 'Nothing urgent — keep your protocol on track and Hannah will surface the next move.',
      pointsReward: 'Stay consistent',
      priority: 0,
    });
  }

  return nudges.sort((a, b) => b.priority - a.priority);
}

export function topNudge(input: GenerateNudgeInput): EngagementNudge {
  return generateNudges(input)[0];
}

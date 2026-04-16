// Body Tracker → Jeffery milestone bridge.
//
// Arnold's body score lives on a 0 to 1000 scale with five Body Tracker tiers
// (Critical, Needs Attention, Developing, Good, Optimal). Jeffery's milestone
// detector at src/lib/agents/jeffery/milestones.ts works on a 0 to 100 Bio
// Optimization scale with five different tier names.
//
// This file is the bridge: it normalizes a Body Tracker score series into the
// 0 to 100 range Jeffery expects, runs detectMilestones, and emits an
// agent_messages entry to Jeffery for each upward tier crossing so the
// supervisor can broadcast to Hannah and the user.
//
// Pure conversion + emit. Safe to call from server actions, edge functions,
// or scheduled jobs.

import { detectMilestones, type MilestoneCrossing } from '@/lib/agents/jeffery/milestones';
import { arnoldNotifyHannah } from '@/lib/agents/message-bus';

export interface BodyScorePoint {
  date: string;
  score: number; // 0-1000 (Body Tracker scale)
}

export function normalizeBodyScoreSeries(
  series: BodyScorePoint[],
): Array<{ date: string; score: number }> {
  return series.map((p) => ({
    date: p.date,
    score: Math.max(0, Math.min(100, Math.round(p.score / 10))),
  }));
}

export function detectBodyScoreMilestones(series: BodyScorePoint[]): MilestoneCrossing[] {
  return detectMilestones(normalizeBodyScoreSeries(series));
}

export interface MilestoneBroadcastResult {
  upwardCrossings: number;
  emitted: number;
}

export async function broadcastBodyScoreMilestones(
  userId: string,
  series: BodyScorePoint[],
): Promise<MilestoneBroadcastResult> {
  const crossings = detectBodyScoreMilestones(series).filter((c) => c.direction === 'up');

  let emitted = 0;
  for (const c of crossings) {
    const id = await arnoldNotifyHannah(
      'body_score_milestone',
      {
        date: c.date,
        scoreNormalized: c.score,
        from: c.from,
        to: c.to,
      },
      userId,
    );
    if (id) emitted++;
  }
  return { upwardCrossings: crossings.length, emitted };
}

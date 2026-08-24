/**
 * Prompt 214: on-demand freshness smoke (code contract).
 * Asserts each hub has a documented recompute path so silent stale pipelines
 * cannot ship without updating the catalog. Live latency probes remain
 * ops-owned (non-destructive production rule).
 */

import { describe, it, expect } from 'vitest';

export type HubId =
  | 'nutrition'
  | 'biology'
  | 'genetics'
  | 'supplements'
  | 'labs'
  | 'wearables';

export interface HubFreshnessContract {
  hub: HubId;
  owningAgent: string;
  /** What event lands new data */
  inputEvent: string;
  /** Module or route that must recompute downstream outputs */
  recomputePath: string;
  /** Soft latency budget in seconds (ops smoke) */
  latencyBudgetSec: number;
}

export const HUB_FRESHNESS_CONTRACTS: HubFreshnessContract[] = [
  {
    hub: 'nutrition',
    owningAgent: 'gordon',
    inputEvent: 'meal log / analyze-text / analyze-photo confirm',
    recomputePath: 'scoreMealForServerInsert + nutrition_insights cron',
    latencyBudgetSec: 30,
  },
  {
    hub: 'biology',
    owningAgent: 'arnold',
    inputEvent: 'body scan persist / composition log',
    recomputePath: 'body_tracker tables + formavision param vector + arnold-tick',
    latencyBudgetSec: 60,
  },
  {
    hub: 'genetics',
    owningAgent: 'hannah',
    inputEvent: 'genetics upload / variant confirm',
    recomputePath: 'genetics surfaces + gordon nutritionByGenetics + ultrathink',
    latencyBudgetSec: 120,
  },
  {
    hub: 'supplements',
    owningAgent: 'jeffery',
    inputEvent: 'CAQ / protocol synthesis / schedule change',
    recomputePath: 'protocol synthesis + timing recommend',
    latencyBudgetSec: 60,
  },
  {
    hub: 'labs',
    owningAgent: 'hannah',
    inputEvent: 'lab PDF upload / confirm',
    recomputePath: 'hannahDecipher (Kelsey-gated) + lab results surface',
    latencyBudgetSec: 180,
  },
  {
    hub: 'wearables',
    owningAgent: 'arnold',
    inputEvent: 'whoop process / google-health sync',
    recomputePath: '/api/integrations/whoop/process + google-health/sync crons',
    latencyBudgetSec: 360,
  },
];

describe('Prompt 214 hub freshness contracts', () => {
  it('covers all six hubs', () => {
    const hubs = HUB_FRESHNESS_CONTRACTS.map((c) => c.hub).sort();
    expect(hubs).toEqual(
      ['biology', 'genetics', 'labs', 'nutrition', 'supplements', 'wearables'].sort(),
    );
  });

  it('every contract names an owner, event, path, and budget', () => {
    for (const c of HUB_FRESHNESS_CONTRACTS) {
      expect(c.owningAgent.length).toBeGreaterThan(0);
      expect(c.inputEvent.length).toBeGreaterThan(0);
      expect(c.recomputePath.length).toBeGreaterThan(0);
      expect(c.latencyBudgetSec).toBeGreaterThan(0);
      expect(c.latencyBudgetSec).toBeLessThanOrEqual(600);
    }
  });

  it('nutrition recompute stays on Gordon ownership', () => {
    const n = HUB_FRESHNESS_CONTRACTS.find((c) => c.hub === 'nutrition');
    expect(n?.owningAgent).toBe('gordon');
  });

  it('biology recompute stays on Arnold ownership', () => {
    const b = HUB_FRESHNESS_CONTRACTS.find((c) => c.hub === 'biology');
    expect(b?.owningAgent).toBe('arnold');
  });
});

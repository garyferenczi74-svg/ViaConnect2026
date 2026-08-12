/**
 * Prompt 214: roster integrity regression lock.
 * Asserts the nine-agent fleet is registered, each has a panel, aliases resolve,
 * and known autonomous triggers are catalogued (code-level, not live log).
 */

import { describe, it, expect } from 'vitest';
import { AGENT_IDS, resolveAgentId, type AgentId } from '../types';
import { AGENT_REGISTRY, orderedRegistry, isKnownAgentId } from '../registry';
import { AGENT_PANELS } from '@/components/admin/jeffery/agents/panels';
import { isKnownSlug, getDisplayName } from '@/lib/getDisplayName';

/** Machine triggers attributed to each agent (Vercel cron, pg_cron, or request gate). */
export const AGENT_TRIGGER_CATALOG: Record<
  AgentId,
  { kind: 'cron' | 'pg_cron' | 'request' | 'dev'; path: string }[]
> = {
  jeffery: [
    { kind: 'pg_cron', path: 'ultrathink_orchestrator_cron' },
    { kind: 'request', path: '/api/admin/jeffery/*' },
  ],
  hannah: [
    { kind: 'cron', path: '/api/cron/hannah-research' },
    { kind: 'cron', path: '/api/bos/worker' },
    { kind: 'request', path: '/api/hannah/ask' },
  ],
  michelangelo: [
    { kind: 'dev', path: 'src/lib/agents/michelangelo/* (OBRA pipeline)' },
  ],
  sherlock: [
    { kind: 'pg_cron', path: 'sherlock_research_hub_cron' },
    { kind: 'request', path: '/api/sherlock/run' },
  ],
  arnold: [
    { kind: 'pg_cron', path: 'arnold_tick_cron' },
    { kind: 'cron', path: '/api/body/goals/recalibrate-cron' },
    { kind: 'request', path: 'body-scan / formavision pipeline' },
  ],
  gordon: [
    { kind: 'pg_cron', path: 'nutrition_insights_daily_cron' },
    { kind: 'request', path: '/api/nutrition/analyze-text' },
    { kind: 'request', path: '/api/nutrition/meals' },
  ],
  kelsey: [
    { kind: 'request', path: '/api/compliance/kelsey/review' },
    { kind: 'request', path: 'publishRule / arnold-recommender gates' },
  ],
  marshall: [
    { kind: 'request', path: '/api/marshall/*' },
    { kind: 'request', path: 'marketing precheck + brand rules' },
  ],
  lex: [
    { kind: 'request', path: '/api/admin/legal/*' },
    { kind: 'request', path: 'legal footer / terms / privacy routes' },
  ],
};

describe('Prompt 214 roster integrity', () => {
  it('registers exactly nine agents', () => {
    expect(AGENT_IDS).toHaveLength(9);
    expect(Object.keys(AGENT_REGISTRY)).toHaveLength(9);
  });

  it('includes gordon and kelsey in the fleet', () => {
    expect(isKnownAgentId('gordon')).toBe(true);
    expect(isKnownAgentId('kelsey')).toBe(true);
    expect(AGENT_REGISTRY.gordon.display_name).toBe('Gordon');
    expect(AGENT_REGISTRY.kelsey.display_name).toBe('Kelsey');
  });

  it('orderedRegistry lists all nine in sort order', () => {
    const ids = orderedRegistry().map((r) => r.agent_id);
    expect(ids).toEqual([
      'jeffery',
      'hannah',
      'michelangelo',
      'sherlock',
      'arnold',
      'gordon',
      'kelsey',
      'marshall',
      'lex',
    ]);
  });

  it('every AgentId has a panel component', () => {
    for (const id of AGENT_IDS) {
      expect(AGENT_PANELS[id]).toBeTypeOf('function');
    }
  });

  it('every agent has at least one catalogued trigger', () => {
    for (const id of AGENT_IDS) {
      const triggers = AGENT_TRIGGER_CATALOG[id];
      expect(triggers.length).toBeGreaterThan(0);
    }
  });

  it('resolves ultrathink name aliases onto panel ids', () => {
    expect(resolveAgentId('sherlock_research_hub')).toBe('sherlock');
    expect(resolveAgentId('jeffery_master')).toBe('jeffery');
    expect(resolveAgentId('gordon')).toBe('gordon');
    expect(resolveAgentId('unknown_bot')).toBeNull();
  });

  it('getDisplayName covers every roster slug', () => {
    for (const id of AGENT_IDS) {
      expect(isKnownSlug(id)).toBe(true);
      expect(getDisplayName(id).length).toBeGreaterThan(0);
      expect(getDisplayName(id)).not.toBe(id);
    }
  });
});

/**
 * Prompt 214a/214c: roster integrity (thirteen agents) + Kelsey retirement.
 */

import { describe, it, expect } from 'vitest';
import { AGENT_IDS, resolveAgentId, type AgentId } from '../types';
import { AGENT_REGISTRY, orderedRegistry, isKnownAgentId } from '../registry';
import { AGENT_PANELS } from '@/components/admin/jeffery/agents/panels';
import { isKnownSlug, getDisplayName } from '@/lib/getDisplayName';
import { KELSEY_DUTY_MAP } from '../kelseyReassignment';

export const AGENT_TRIGGER_CATALOG: Record<
  AgentId,
  { kind: 'cron' | 'pg_cron' | 'request' | 'dev' | 'chain'; path: string }[]
> = {
  jeffery: [
    { kind: 'cron', path: '/api/cron/synchronism-daily' },
    { kind: 'cron', path: '/api/cron/ultrathink-feeds' },
    { kind: 'pg_cron', path: 'ultrathink_phase1_feeds_cron' },
  ],
  hannah: [
    { kind: 'chain', path: 'synchronism stage compose/surface' },
    { kind: 'cron', path: '/api/cron/hannah-research' },
  ],
  gordon: [
    { kind: 'chain', path: 'synchronism stage domain_refresh' },
    { kind: 'request', path: '/api/nutrition/analyze-text' },
  ],
  arnold: [
    { kind: 'chain', path: 'synchronism stage domain_refresh' },
    { kind: 'pg_cron', path: 'arnold_tick_cron' },
  ],
  michelangelo: [{ kind: 'dev', path: 'CI / OBRA pipeline' }],
  hounddog: [
    { kind: 'chain', path: 'synchronism stage ingest' },
    { kind: 'request', path: '/api/hounddog/collectors/tick' },
  ],
  sherlock: [
    { kind: 'chain', path: 'synchronism stage curate' },
    { kind: 'pg_cron', path: 'sherlock_research_hub_cron' },
  ],
  marshall: [
    { kind: 'chain', path: 'synchronism stage gate' },
    { kind: 'request', path: 'compliance rules + precheck' },
  ],
  lex: [
    { kind: 'chain', path: 'synchronism stage gate (escalation)' },
    { kind: 'request', path: '/api/admin/legal/* + Stage 2 review' },
  ],
  security_advisor: [{ kind: 'chain', path: 'synchronism stage guard' }],
  performance_advisor: [{ kind: 'chain', path: 'synchronism stage guard' }],
  thanos: [
    { kind: 'chain', path: 'synchronism stage ingest + domain_refresh' },
    { kind: 'request', path: 'peptide education allowlist ingest' },
  ],
  elysium: [
    { kind: 'chain', path: 'synchronism stage ingest + domain_refresh' },
    { kind: 'request', path: 'genetics interpretation + IGSR watch' },
  ],
};

describe('Prompt 214c roster integrity', () => {
  it('registers exactly thirteen agents', () => {
    expect(AGENT_IDS).toHaveLength(13);
    expect(Object.keys(AGENT_REGISTRY)).toHaveLength(13);
  });

  it('does not register kelsey as a live AgentId', () => {
    expect(isKnownAgentId('kelsey')).toBe(false);
    expect(AGENT_IDS.includes('kelsey' as AgentId)).toBe(false);
  });

  it('aliases historical kelsey events to lex', () => {
    expect(resolveAgentId('kelsey')).toBe('lex');
  });

  it('includes hounddog, advisors, thanos, and elysium', () => {
    expect(isKnownAgentId('hounddog')).toBe(true);
    expect(isKnownAgentId('security_advisor')).toBe(true);
    expect(isKnownAgentId('performance_advisor')).toBe(true);
    expect(isKnownAgentId('thanos')).toBe(true);
    expect(isKnownAgentId('elysium')).toBe(true);
  });

  it('orderedRegistry matches Section 1 order', () => {
    expect(orderedRegistry().map((r) => r.agent_id)).toEqual([...AGENT_IDS]);
  });

  it('every AgentId has a panel', () => {
    for (const id of AGENT_IDS) {
      expect(AGENT_PANELS[id]).toBeTypeOf('function');
    }
  });

  it('every agent has at least one trigger', () => {
    for (const id of AGENT_IDS) {
      expect(AGENT_TRIGGER_CATALOG[id].length).toBeGreaterThan(0);
    }
  });

  it('getDisplayName covers every roster slug', () => {
    for (const id of AGENT_IDS) {
      expect(isKnownSlug(id)).toBe(true);
      expect(getDisplayName(id).length).toBeGreaterThan(0);
    }
    expect(getDisplayName('hounddog')).toBe('Hound Dog');
    expect(getDisplayName('thanos')).toBe('Thanos');
    expect(getDisplayName('elysium')).toBe('Elysium');
  });

  it('Kelsey duty map reassigns every duty to marshall or lex', () => {
    expect(KELSEY_DUTY_MAP.length).toBeGreaterThan(5);
    for (const row of KELSEY_DUTY_MAP) {
      expect(['marshall', 'lex']).toContain(row.owner);
    }
  });
});

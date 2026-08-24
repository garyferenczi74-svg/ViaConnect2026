/**
 * Brief 23: Command Center roster integrity (17 Grok agents) + Kelsey retirement.
 */

import { describe, it, expect } from 'vitest';
import { AGENT_IDS, resolveAgentId, type AgentId } from '../types';
import { AGENT_REGISTRY, orderedRegistry, isKnownAgentId } from '../registry';
import { AGENT_PANELS } from '@/components/admin/jeffery/agents/panels';
import { isKnownSlug, getDisplayName } from '@/lib/getDisplayName';
import { KELSEY_DUTY_MAP } from '../kelseyReassignment';
import { deriveStatus } from '../status';
import { mapUltrathinkRegistry } from '../activity-tracker';

export const AGENT_TRIGGER_CATALOG: Record<
  AgentId,
  { kind: 'cron' | 'pg_cron' | 'request' | 'dev' | 'chain'; path: string }[]
> = {
  jeffery: [
    { kind: 'cron', path: '/api/cron/synchronism-daily' },
    { kind: 'cron', path: '/api/cron/ultrathink-feeds' },
    { kind: 'pg_cron', path: 'ultrathink_phase1_feeds_cron' },
  ],
  picasso: [],
  michelangelo: [{ kind: 'dev', path: 'CI / OBRA pipeline' }],
  conan: [],
  hermes: [{ kind: 'cron', path: '/api/cron/run-hermes-scout' }],
  gene: [],
  elysium: [
    { kind: 'chain', path: 'synchronism stage ingest + domain_refresh' },
    { kind: 'request', path: 'genetics interpretation + IGSR watch' },
  ],
  marshall: [
    { kind: 'chain', path: 'synchronism stage gate' },
    { kind: 'request', path: 'compliance rules + precheck' },
  ],
  martha: [],
  hannah: [
    { kind: 'chain', path: 'synchronism stage compose/surface' },
    { kind: 'cron', path: '/api/cron/hannah-research' },
  ],
  thanos: [
    { kind: 'chain', path: 'synchronism stage ingest + domain_refresh' },
    { kind: 'request', path: 'peptide education allowlist ingest' },
  ],
  elizabeth: [{ kind: 'cron', path: '/api/cron/run-elizabeth-research' }],
  lex: [
    { kind: 'chain', path: 'synchronism stage gate (escalation)' },
    { kind: 'request', path: '/api/admin/legal/* + Stage 2 review' },
  ],
  sherlock: [
    { kind: 'chain', path: 'synchronism stage curate' },
    { kind: 'pg_cron', path: 'sherlock_research_hub_cron' },
  ],
  watson: [],
  arnold: [
    { kind: 'chain', path: 'synchronism stage domain_refresh' },
    { kind: 'pg_cron', path: 'arnold_tick_cron' },
  ],
  hounddog: [
    { kind: 'chain', path: 'synchronism stage ingest' },
    { kind: 'request', path: '/api/hounddog/collectors/tick' },
  ],
};

const REAL_GROK_ROSTER: readonly AgentId[] = [
  'jeffery',
  'picasso',
  'michelangelo',
  'conan',
  'hermes',
  'gene',
  'elysium',
  'marshall',
  'martha',
  'hannah',
  'thanos',
  'elizabeth',
  'lex',
  'sherlock',
  'watson',
  'arnold',
  'hounddog',
];

const IDLE_WITHOUT_OPS_ROW: readonly AgentId[] = [
  'picasso',
  'conan',
  'gene',
  'martha',
  'watson',
];

describe('Brief 23 Command Center roster integrity', () => {
  it('registers exactly the 17 Grok roster seats', () => {
    expect(AGENT_IDS).toHaveLength(17);
    expect(Object.keys(AGENT_REGISTRY)).toHaveLength(17);
    expect([...AGENT_IDS]).toEqual([...REAL_GROK_ROSTER]);
  });

  it('does not register kelsey, gordon, or invented advisor seats', () => {
    expect(isKnownAgentId('kelsey')).toBe(false);
    expect(isKnownAgentId('gordon')).toBe(false);
    expect(isKnownAgentId('security_advisor')).toBe(false);
    expect(isKnownAgentId('performance_advisor')).toBe(false);
    expect(AGENT_IDS.includes('kelsey' as AgentId)).toBe(false);
    expect(AGENT_IDS.includes('gordon' as AgentId)).toBe(false);
    expect(AGENT_IDS.includes('security_advisor' as AgentId)).toBe(false);
    expect(AGENT_IDS.includes('performance_advisor' as AgentId)).toBe(false);
  });

  it('aliases historical kelsey events to lex', () => {
    expect(resolveAgentId('kelsey')).toBe('lex');
  });

  it('includes the real Grok seats including Picasso, Hermes, and Elizabeth', () => {
    expect(isKnownAgentId('hounddog')).toBe(true);
    expect(isKnownAgentId('thanos')).toBe(true);
    expect(isKnownAgentId('elysium')).toBe(true);
    expect(isKnownAgentId('picasso')).toBe(true);
    expect(isKnownAgentId('conan')).toBe(true);
    expect(isKnownAgentId('hermes')).toBe(true);
    expect(isKnownAgentId('gene')).toBe(true);
    expect(isKnownAgentId('martha')).toBe(true);
    expect(isKnownAgentId('elizabeth')).toBe(true);
    expect(isKnownAgentId('watson')).toBe(true);
    expect(resolveAgentId('hannahai')).toBe('hannah');
  });

  it('orderedRegistry matches Brief 23 roster order', () => {
    expect(orderedRegistry().map((r) => r.agent_id)).toEqual([...AGENT_IDS]);
  });

  it('every AgentId has a panel', () => {
    for (const id of AGENT_IDS) {
      expect(AGENT_PANELS[id]).toBeTypeOf('function');
    }
  });

  it('seats with real jobs keep triggers; idle seats stay empty', () => {
    for (const id of AGENT_IDS) {
      if (IDLE_WITHOUT_OPS_ROW.includes(id)) {
        expect(AGENT_TRIGGER_CATALOG[id]).toHaveLength(0);
      } else {
        expect(AGENT_TRIGGER_CATALOG[id].length).toBeGreaterThan(0);
      }
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
    expect(getDisplayName('picasso')).toBe('Picasso');
    expect(getDisplayName('hermes')).toBe('Hermes');
    expect(getDisplayName('elizabeth')).toBe('Elizabeth');
  });

  it('idle when no ops row / heartbeat', () => {
    expect(deriveStatus(null)).toBe('idle');
    expect(mapUltrathinkRegistry({
      agent_name: 'picasso',
      display_name: 'Picasso',
      health_status: 'unknown',
      last_heartbeat_at: null,
      consecutive_misses: 0,
      is_active: true,
    })).toMatchObject({
      agent_id: 'picasso',
      status: 'idle',
      last_heartbeat: '',
    });
    expect(mapUltrathinkRegistry({
      agent_name: 'security_advisor',
      display_name: 'Security Advisor',
      health_status: 'healthy',
      last_heartbeat_at: '2026-08-23T20:31:20Z',
      consecutive_misses: 0,
      is_active: true,
    })).toBeNull();
    expect(resolveAgentId('gordon')).toBeNull();
  });

  it('Kelsey duty map reassigns every duty to marshall or lex', () => {
    expect(KELSEY_DUTY_MAP.length).toBeGreaterThan(5);
    for (const row of KELSEY_DUTY_MAP) {
      expect(['marshall', 'lex']).toContain(row.owner);
    }
  });
});

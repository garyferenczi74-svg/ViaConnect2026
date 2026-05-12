// Tests for src/lib/scoring/hannah-prompt.ts.
//
// Phase C of bundled Prompts #159 + #161. Hannah's prompt is the first
// user-facing copy this PR ships, so the assertions below double as the
// Marshall pre-delivery scan: no em-dashes (U+2014), no en-dashes
// (U+2013), no emojis, no banned compounds, no banned score names.

import { describe, it, expect } from 'vitest';
import {
  HANNAH_SYSTEM_PROMPT,
  buildHannahUserMessage,
  type HannahInputBundle,
} from '../hannah-prompt';

const EM_DASH = '—';
const EN_DASH = '–';
// Common emoji codepoint blocks: Misc Symbols, Misc Symbols & Pictographs,
// Emoticons, Transport & Map, Supplemental Symbols, Dingbats.
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function makeBundle(overrides: Partial<HannahInputBundle> = {}): HannahInputBundle {
  return {
    user_id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Gary',
    trigger: {
      source: 'daily_log',
      event_id: 'evt-1',
      bypass_cooldown: false,
    },
    tier: 1,
    diagnostic_foundation: {
      caq: {
        completed: true,
        completed_at: '2026-05-01T12:00:00Z',
        baseline_score: 68,
        version_number: 1,
      },
      labs: { present: false, uploaded_at: null, panel_count: 0 },
      genetics: { present: false, processed_at: null, panel: null },
    },
    engagement_state: {
      nutrition: { last_engaged_at: '2026-05-10T08:00:00Z', recent_events_7d: 5, recent_events_30d: 12 },
      supplements: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
      body_tracker: { last_engaged_at: '2026-05-09T08:00:00Z', recent_events_7d: 2, recent_events_30d: 6 },
      wearable: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
      plug_ins: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
      helix_challenges: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
    },
    previous: {
      score: 72.4,
      computed_at: '2026-05-10T18:30:00Z',
      compute_version: '2.0.0',
    },
    ...overrides,
  };
}

describe('HANNAH_SYSTEM_PROMPT brand and tone', () => {
  it('is a non-empty string', () => {
    expect(typeof HANNAH_SYSTEM_PROMPT).toBe('string');
    expect(HANNAH_SYSTEM_PROMPT.length).toBeGreaterThan(200);
  });

  it('contains zero em-dashes (U+2014)', () => {
    expect(HANNAH_SYSTEM_PROMPT.indexOf(EM_DASH)).toBe(-1);
  });

  it('contains zero en-dashes (U+2013)', () => {
    expect(HANNAH_SYSTEM_PROMPT.indexOf(EN_DASH)).toBe(-1);
  });

  it('contains zero emojis', () => {
    expect(EMOJI_REGEX.test(HANNAH_SYSTEM_PROMPT)).toBe(false);
  });

  it('mentions Bio Optimization Score by name at least once', () => {
    expect(HANNAH_SYSTEM_PROMPT).toContain('Bio Optimization Score');
  });

  it('never says Vitality Score', () => {
    expect(HANNAH_SYSTEM_PROMPT).not.toContain('Vitality Score');
  });

  it('never mentions Tesofensine', () => {
    expect(HANNAH_SYSTEM_PROMPT.toLowerCase()).not.toContain('tesofensine');
  });

  it('never mentions Semaglutide', () => {
    expect(HANNAH_SYSTEM_PROMPT.toLowerCase()).not.toContain('semaglutide');
  });

  it('mentions all six engagement levers by name', () => {
    expect(HANNAH_SYSTEM_PROMPT).toContain('Nutrition');
    expect(HANNAH_SYSTEM_PROMPT).toContain('Supplements');
    expect(HANNAH_SYSTEM_PROMPT).toContain('Body Tracker');
    expect(HANNAH_SYSTEM_PROMPT).toContain('Wearable Data');
    expect(HANNAH_SYSTEM_PROMPT).toContain('Plug Ins');
    expect(HANNAH_SYSTEM_PROMPT).toContain('Helix Challenges');
  });

  it('mentions floor / ceiling / decay rules', () => {
    expect(HANNAH_SYSTEM_PROMPT.toLowerCase()).toContain('floor');
    expect(HANNAH_SYSTEM_PROMPT.toLowerCase()).toContain('ceiling');
    expect(HANNAH_SYSTEM_PROMPT.toLowerCase()).toContain('decay');
  });

  it('mentions getDisplayName usage or display_name addressing', () => {
    const lower = HANNAH_SYSTEM_PROMPT.toLowerCase();
    const mentionsHelper = lower.includes('getdisplayname') || lower.includes('display_name') || lower.includes('display name');
    expect(mentionsHelper).toBe(true);
  });

  it('forbids medical advice language', () => {
    const lower = HANNAH_SYSTEM_PROMPT.toLowerCase();
    expect(lower).toContain('not a doctor');
    expect(lower).toContain('educational');
  });

  it('specifies single forced tool call output', () => {
    expect(HANNAH_SYSTEM_PROMPT).toContain('report_bos_compute');
  });
});

describe('buildHannahUserMessage', () => {
  it('returns a JSON-parseable string', () => {
    const out = buildHannahUserMessage(makeBundle());
    expect(typeof out).toBe('string');
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('includes all required top-level keys', () => {
    const parsed = JSON.parse(buildHannahUserMessage(makeBundle()));
    expect(parsed).toHaveProperty('user_id');
    expect(parsed).toHaveProperty('display_name');
    expect(parsed).toHaveProperty('trigger');
    expect(parsed).toHaveProperty('tier');
    expect(parsed).toHaveProperty('diagnostic_foundation');
    expect(parsed).toHaveProperty('engagement_state');
    expect(parsed).toHaveProperty('previous');
  });

  it('passes user_id and display_name through unchanged', () => {
    const bundle = makeBundle({ user_id: 'abc-123', display_name: 'Sarah' });
    const parsed = JSON.parse(buildHannahUserMessage(bundle));
    expect(parsed.user_id).toBe('abc-123');
    expect(parsed.display_name).toBe('Sarah');
  });

  it('preserves trigger structure', () => {
    const parsed = JSON.parse(buildHannahUserMessage(makeBundle()));
    expect(parsed.trigger.source).toBe('daily_log');
    expect(parsed.trigger.event_id).toBe('evt-1');
    expect(parsed.trigger.bypass_cooldown).toBe(false);
  });

  it('preserves tier integer', () => {
    const parsed = JSON.parse(buildHannahUserMessage(makeBundle({ tier: 2 })));
    expect(parsed.tier).toBe(2);
  });

  it('preserves diagnostic_foundation shape', () => {
    const parsed = JSON.parse(buildHannahUserMessage(makeBundle()));
    expect(parsed.diagnostic_foundation.caq.baseline_score).toBe(68);
    expect(parsed.diagnostic_foundation.labs.present).toBe(false);
    expect(parsed.diagnostic_foundation.genetics.present).toBe(false);
  });

  it('preserves engagement_state shape with all six levers', () => {
    const parsed = JSON.parse(buildHannahUserMessage(makeBundle()));
    expect(parsed.engagement_state.nutrition.recent_events_7d).toBe(5);
    expect(parsed.engagement_state.supplements).toBeDefined();
    expect(parsed.engagement_state.body_tracker).toBeDefined();
    expect(parsed.engagement_state.wearable).toBeDefined();
    expect(parsed.engagement_state.plug_ins).toBeDefined();
    expect(parsed.engagement_state.helix_challenges).toBeDefined();
  });

  it('preserves previous score block', () => {
    const parsed = JSON.parse(buildHannahUserMessage(makeBundle()));
    expect(parsed.previous.score).toBe(72.4);
    expect(parsed.previous.compute_version).toBe('2.0.0');
  });

  it('does not leak any PII or fields the bundle did not include', () => {
    const bundle = makeBundle();
    const parsed = JSON.parse(buildHannahUserMessage(bundle));
    // Spot-check: nothing like password / token / email_address should appear.
    const allKeys = JSON.stringify(parsed).toLowerCase();
    expect(allKeys).not.toContain('password');
    expect(allKeys).not.toContain('access_token');
    expect(allKeys).not.toContain('email_address');
  });

  it('output payload itself contains zero em-dashes and en-dashes', () => {
    const out = buildHannahUserMessage(makeBundle());
    expect(out.indexOf(EM_DASH)).toBe(-1);
    expect(out.indexOf(EN_DASH)).toBe(-1);
  });
});

// Prompt 192 Task 3: source contract tests for the insights routes and
// the two edge function relays. These assert the load bearing strings of
// each handler (auth gates, envelopes, filters) so a refactor that drops
// a security or compliance property fails loudly without HTTP plumbing.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (rel: string): string => readFileSync(path.join(root, rel), 'utf8');

const getRoute = read('src/app/api/nutrition/insights/route.ts');
const refreshRoute = read('src/app/api/nutrition/insights/refresh/route.ts');
const patchRoute = read('src/app/api/nutrition/insights/[id]/route.ts');
const cronRoute = read('src/app/api/nutrition/insights/cron/route.ts');
const dailyFn = read('supabase/functions/nutrition-insights-daily/index.ts');
const weeklyFn = read('supabase/functions/nutrition-insights-weekly/index.ts');

describe('GET /api/nutrition/insights contract', () => {
  it('only ever returns compliance_passed rows', () => {
    expect(getRoute).toContain(".eq('compliance_passed', true)");
  });

  it('lazily filters expired actives via expires_at instead of returning them', () => {
    expect(getRoute).toContain(".gt('expires_at'");
  });

  it('fails open to an empty degraded payload on read failure', () => {
    expect(getRoute).toContain('degraded: true');
    expect(getRoute).toContain('insights: []');
  });

  it('clamps the limit through the tested helper', () => {
    expect(getRoute).toContain('clampLimitParam');
  });

  it('scopes to the session user and rejects anonymous calls', () => {
    expect(getRoute).toContain(".eq('user_id', userId)");
    expect(getRoute).toContain('status: 401');
  });
});

describe('POST /api/nutrition/insights/refresh contract', () => {
  it('emits the 429 rate limit envelope with retryAfterSeconds', () => {
    expect(refreshRoute).toContain("error: 'rate_limited'");
    expect(refreshRoute).toContain('retryAfterSeconds');
    expect(refreshRoute).toContain('status: 429');
  });

  it('checks the manual trigger window against the runs ledger', () => {
    expect(refreshRoute).toContain(".eq('trigger', 'manual')");
    expect(refreshRoute).toContain('manualRefreshGate');
  });

  it('awaits the runner and returns 202 with the run id', () => {
    expect(refreshRoute).toContain('await runInsightsForUser');
    expect(refreshRoute).toContain('status: 202');
    expect(refreshRoute).toContain('runId: result.runId');
  });

  it('maps runner errors to a 502 envelope', () => {
    expect(refreshRoute).toContain('status: 502');
  });
});

describe('PATCH /api/nutrition/insights/[id] contract', () => {
  it('whitelists the body through the tested parser', () => {
    expect(patchRoute).toContain('parseInsightPatchBody');
  });

  it('updates status through the user scoped client so RLS enforces ownership', () => {
    expect(patchRoute).toContain("createClient");
    expect(patchRoute).not.toContain('createAdminClient');
    expect(patchRoute).toContain(".eq('user_id', userId)");
  });

  it('returns 404 when no row changed and writes feedback to the feedback table', () => {
    expect(patchRoute).toContain('status: 404');
    expect(patchRoute).toContain("from('nutrition_insight_feedback')");
  });
});

describe('POST /api/nutrition/insights/cron contract', () => {
  it('uses the timing safe CRON_SECRET Bearer check', () => {
    expect(cronRoute).toContain('timingSafeEqual');
    expect(cronRoute).toContain('CRON_SECRET');
    expect(cronRoute).toContain("status: 401");
  });

  it('rejects an unset secret outright', () => {
    expect(cronRoute).toContain('expected.length <= BEARER_PREFIX.length');
  });

  it('validates the trigger body field', () => {
    expect(cronRoute).toContain("trigger !== 'daily' && trigger !== 'weekly'");
  });

  it('filters eligibility to scored meals in the window', () => {
    expect(cronRoute).toContain(".not('quality_score', 'is', null)");
    expect(cronRoute).toContain(".gte('logged_at', sinceIso)");
  });

  it('reports processed and failed counts', () => {
    expect(cronRoute).toContain('{ processed, failed }');
  });
});

describe('edge function relays', () => {
  it('daily relay forwards the Bearer secret and the daily trigger', () => {
    expect(dailyFn).toContain('Bearer ${CRON_SECRET}');
    expect(dailyFn).toContain("const TRIGGER = 'daily'");
    expect(dailyFn).toContain('trigger: TRIGGER');
    expect(dailyFn).toContain('/api/nutrition/insights/cron');
  });

  it('weekly relay forwards the Bearer secret and the weekly trigger', () => {
    expect(weeklyFn).toContain('Bearer ${CRON_SECRET}');
    expect(weeklyFn).toContain("const TRIGGER = 'weekly'");
    expect(weeklyFn).toContain('trigger: TRIGGER');
    expect(weeklyFn).toContain('/api/nutrition/insights/cron');
  });

  it('both default SITE_URL to the production host and refuse a missing secret', () => {
    for (const src of [dailyFn, weeklyFn]) {
      expect(src).toContain("'https://www.viaconnectapp.com'");
      expect(src).toContain('INSIGHTS_CRON_SECRET');
      expect(src).toContain('relay secret not configured');
    }
  });
});

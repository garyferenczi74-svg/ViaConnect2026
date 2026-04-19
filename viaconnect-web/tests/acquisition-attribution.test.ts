// Prompt #94 Phase 1.5: pure-function tests for the attribution layer.
// Migration shape assertions live alongside.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  classifyChannel,
  isPaidChannel,
  isOrganicChannel,
  deriveAttributionFlags,
  ACQUISITION_CHANNELS,
} from '@/lib/analytics/acquisition-attribution';

describe('classifyChannel', () => {
  it('practitioner invitation token wins over UTM', () => {
    const ch = classifyChannel({
      practitionerInvitationToken: 'tok',
      utmSource: 'facebook',
      utmMedium: 'cpc',
    });
    expect(ch).toBe('practitioner_referral');
  });

  it('consumer referrer wins over UTM', () => {
    const ch = classifyChannel({
      consumerReferrerUserId: 'u-1',
      utmSource: 'google',
      utmMedium: 'cpc',
    });
    expect(ch).toBe('consumer_referral');
  });

  it.each([
    [{ utmSource: 'facebook' }, 'facebook_ads'],
    [{ utmSource: 'fb' }, 'facebook_ads'],
    [{ utmSource: 'instagram' }, 'facebook_ads'],
    [{ utmSource: 'tiktok' }, 'tiktok_ads'],
    [{ utmSource: 'tt' }, 'tiktok_ads'],
    [{ utmSource: 'google', utmMedium: 'cpc' }, 'google_ads'],
    [{ utmSource: 'google', utmMedium: 'paid' }, 'google_ads'],
    [{ utmMedium: 'podcast' }, 'podcast_sponsorship'],
    [{ utmSource: 'forbes' }, 'forbes_article'],
    [{ utmMedium: 'email' }, 'direct_email'],
    [{ utmMedium: 'newsletter' }, 'direct_email'],
    [{ utmMedium: 'conference' }, 'conference'],
    [{ utmMedium: 'event' }, 'conference'],
    [{ utmMedium: 'content' }, 'content_marketing'],
    [{ utmSource: 'blog' }, 'content_marketing'],
  ] as const)('classifies %j as %s', (ctx, expected) => {
    expect(classifyChannel(ctx as any)).toBe(expected);
  });

  it('returns direct_traffic when no UTM and no referrer', () => {
    expect(classifyChannel({})).toBe('direct_traffic');
  });

  it('returns seo_organic when referrer present but no UTM', () => {
    expect(classifyChannel({ referrerUrl: 'https://google.com' })).toBe('seo_organic');
  });

  it('falls through to other for unknown UTM combos', () => {
    expect(classifyChannel({ utmSource: 'mystery_network' })).toBe('other');
  });

  it('Google search without paid medium does NOT count as google_ads', () => {
    // Organic Google traffic with utm_source=google but no cpc medium.
    // Treated as other rather than paid; CAC is honest.
    expect(classifyChannel({ utmSource: 'google', utmMedium: 'organic' })).toBe('other');
  });
});

describe('isPaidChannel / isOrganicChannel', () => {
  it.each([
    'facebook_ads', 'google_ads', 'tiktok_ads',
    'podcast_sponsorship', 'content_marketing',
  ] as const)('%s is paid', (ch) => {
    expect(isPaidChannel(ch)).toBe(true);
    expect(isOrganicChannel(ch)).toBe(false);
  });

  it.each([
    'seo_organic', 'direct_traffic', 'pr_earned_media',
  ] as const)('%s is organic', (ch) => {
    expect(isOrganicChannel(ch)).toBe(true);
    expect(isPaidChannel(ch)).toBe(false);
  });

  it.each([
    'practitioner_referral', 'consumer_referral',
    'direct_email', 'conference', 'forbes_article',
    'unknown', 'other',
  ] as const)('%s is neither paid nor organic', (ch) => {
    expect(isPaidChannel(ch)).toBe(false);
    expect(isOrganicChannel(ch)).toBe(false);
  });
});

describe('deriveAttributionFlags', () => {
  it('flags practitioner-attached when invitation token present', () => {
    const flags = deriveAttributionFlags('practitioner_referral', {
      practitionerInvitationToken: 'tok',
    });
    expect(flags.isPractitionerAttached).toBe(true);
    expect(flags.isPaidAcquisition).toBe(false);
    expect(flags.isOrganic).toBe(false);
  });

  it('flags paid for facebook_ads', () => {
    const flags = deriveAttributionFlags('facebook_ads', { utmSource: 'facebook' });
    expect(flags.isPaidAcquisition).toBe(true);
    expect(flags.isOrganic).toBe(false);
  });

  it('flags organic for seo_organic', () => {
    const flags = deriveAttributionFlags('seo_organic', { referrerUrl: 'https://google.com' });
    expect(flags.isPaidAcquisition).toBe(false);
    expect(flags.isOrganic).toBe(true);
  });
});

describe('Channel taxonomy completeness', () => {
  it('exposes exactly the 15 spec channels', () => {
    expect(ACQUISITION_CHANNELS.length).toBe(15);
  });
});

describe('Phase 1 migration shape', () => {
  const repo = path.resolve(__dirname, '..');

  it('marketing_spend has the normalize_spend_month trigger', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000190_marketing_spend.sql'),
      'utf8',
    );
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.marketing_spend/);
    expect(sql).toMatch(/normalize_spend_month_trigger/);
    expect(sql).toMatch(/POLICY marketing_spend_admin_all/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it('customer_acquisition_attribution is admin-read + self-insert only', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000200_customer_acquisition_attribution.sql'),
      'utf8',
    );
    expect(sql).toMatch(/POLICY cac_attrib_admin_all/);
    expect(sql).toMatch(/POLICY cac_attrib_self_insert/);
    expect(sql).toMatch(/UNIQUE/);
  });

  it('archetypes seeds all 7 spec archetypes', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000210_archetypes.sql'),
      'utf8',
    );
    for (const id of [
      'precision_wellness_seeker',
      'biohacker_optimizer',
      'chronic_condition_navigator',
      'preventive_health_parent',
      'performance_athlete',
      'longevity_investor',
      'genetic_curious_explorer',
    ]) {
      expect(sql).toContain(`'${id}'`);
    }
    expect(sql).toMatch(/POLICY customer_archetypes_admin_all/);
  });

  it('unit_economics_snapshots has admin RLS only, no public read', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000220_unit_economics_snapshots.sql'),
      'utf8',
    );
    expect(sql).toMatch(/POLICY ue_snap_admin_all/);
    expect(sql).not.toMatch(/POLICY .*_read_all/);
    expect(sql).toMatch(/snapshot_month/);
    expect(sql).toMatch(/ltv_24mo_cents/);
    expect(sql).toMatch(/blended_cac_cents/);
  });

  it('all four Phase 1 migrations are append-only', () => {
    for (const name of [
      '20260418000190_marketing_spend.sql',
      '20260418000200_customer_acquisition_attribution.sql',
      '20260418000210_archetypes.sql',
      '20260418000220_unit_economics_snapshots.sql',
    ]) {
      const sql = readFileSync(path.join(repo, 'supabase/migrations', name), 'utf8');
      expect(sql).not.toMatch(/DROP COLUMN/i);
      expect(sql).not.toMatch(/RENAME COLUMN/i);
    }
  });
});

// Phase 2 unit suite: taxonomy invariants + migration shape.
// Static SQL parsing checks ensure RLS, append-only constraints, and
// (critically) the ABSENCE of practitioner-read policies on helix_* tables.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CREDENTIAL_TYPES,
  PRACTITIONER_TIER_IDS,
  CERTIFICATION_LEVEL_IDS,
  isNaturopathLikeCredential,
  practitionerTierMonthlyCents,
  certificationOnetimeCents,
  certificationRecertCents,
} from '@/lib/practitioner/taxonomy';

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'supabase', 'migrations');

function readMigration(name: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
}

describe('practitioner taxonomy', () => {
  it('CREDENTIAL_TYPES covers exactly the 9 spec values', () => {
    expect(new Set(CREDENTIAL_TYPES)).toEqual(
      new Set(['md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other']),
    );
  });

  it('isNaturopathLikeCredential is true only for nd, dc, lac', () => {
    expect(isNaturopathLikeCredential('nd')).toBe(true);
    expect(isNaturopathLikeCredential('dc')).toBe(true);
    expect(isNaturopathLikeCredential('lac')).toBe(true);
    for (const c of ['md', 'do', 'np', 'pa', 'rd', 'other']) {
      expect(isNaturopathLikeCredential(c)).toBe(false);
    }
  });

  it('PRACTITIONER_TIER_IDS are standard and white_label', () => {
    expect(new Set(PRACTITIONER_TIER_IDS)).toEqual(new Set(['standard', 'white_label']));
  });

  it('practitioner monthly pricing matches Prompt #91 spec', () => {
    expect(practitionerTierMonthlyCents('standard')).toBe(12888);
    expect(practitionerTierMonthlyCents('white_label')).toBe(28888);
  });

  it('CERTIFICATION_LEVEL_IDS cover the three levels in spec', () => {
    expect(new Set(CERTIFICATION_LEVEL_IDS)).toEqual(
      new Set(['foundation', 'precision_designer', 'master_practitioner']),
    );
  });

  it('certification one-time pricing matches spec (free / 888 / 1888)', () => {
    expect(certificationOnetimeCents('foundation')).toBe(0);
    expect(certificationOnetimeCents('precision_designer')).toBe(88800);
    expect(certificationOnetimeCents('master_practitioner')).toBe(188800);
  });

  it('certification annual recert is 388 for paid levels, none for foundation', () => {
    expect(certificationRecertCents('foundation')).toBeNull();
    expect(certificationRecertCents('precision_designer')).toBe(38800);
    expect(certificationRecertCents('master_practitioner')).toBe(38800);
  });
});

describe('Phase 2 migration shape', () => {
  it('practitioner_tiers seeds standard and white_label with spec pricing', () => {
    const sql = readMigration('20260418000060_practitioner_tiers.sql');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.practitioner_tiers/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/'standard'[\s\S]*?12888/);
    expect(sql).toMatch(/'white_label'[\s\S]*?28888/);
    expect(sql).toMatch(/wholesale_discount_percent/);
  });

  it('certification_levels seeds three levels with spec pricing', () => {
    const sql = readMigration('20260418000070_certification_levels.sql');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.certification_levels/);
    expect(sql).toMatch(/'foundation'/);
    expect(sql).toMatch(/'precision_designer'[\s\S]*?88800/);
    expect(sql).toMatch(/'master_practitioner'[\s\S]*?188800/);
    expect(sql).toMatch(/ce_partnership_status/);
  });

  it('practitioners table links 1:1 to auth.users via UNIQUE user_id', () => {
    const sql = readMigration('20260418000080_practitioners.sql');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.practitioners/);
    expect(sql).toMatch(/user_id UUID NOT NULL REFERENCES auth\.users\(id\)[\s\S]*?UNIQUE/);
    expect(sql).toMatch(/credential_type TEXT NOT NULL CHECK \(credential_type IN/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it('practitioner_subscriptions enforces FK + RLS', () => {
    const sql = readMigration('20260418000090_practitioner_subscriptions.sql');
    expect(sql).toMatch(/practitioner_id UUID NOT NULL REFERENCES public\.practitioners/);
    expect(sql).toMatch(/tier_id TEXT NOT NULL REFERENCES public\.practitioner_tiers/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it('practitioner_certifications uses cert level FK', () => {
    const sql = readMigration('20260418000100_practitioner_certifications.sql');
    expect(sql).toMatch(/certification_level_id TEXT NOT NULL REFERENCES public\.certification_levels/);
    expect(sql).toMatch(/lms_progress_percent INTEGER/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it('practitioner_patients extension is append-only ALTER ADD COLUMN IF NOT EXISTS', () => {
    const sql = readMigration('20260418000110_practitioner_patients_extension.sql');
    // No DROP, no rename (no DROP COLUMN, no ALTER COLUMN ... RENAME)
    expect(sql).not.toMatch(/DROP COLUMN/i);
    expect(sql).not.toMatch(/RENAME COLUMN/i);
    // ADD COLUMN IF NOT EXISTS for the new spec columns
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS invitation_token/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS consent_share_caq/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS consent_share_engagement_score/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS practitioner_notes/);
  });
});

describe('Helix isolation guarantee (Phase 2.7)', () => {
  it('cross-account RLS migration creates NO practitioner-read policy on any helix_* table', () => {
    const sql = readMigration('20260418000120_cross_account_consent_rls.sql');
    // The word "helix" must not appear in any policy/table reference
    expect(sql.toLowerCase()).not.toMatch(/helix_/);
  });

  it('cross-account RLS adds practitioner SELECT policies on the canonical patient tables', () => {
    const sql = readMigration('20260418000120_cross_account_consent_rls.sql');
    const expectedTables = [
      'assessment_results',
      'user_current_supplements',
      'supplement_adherence',
      'genetic_profiles',
      'supplement_protocols',
    ];
    for (const t of expectedTables) {
      expect(sql).toMatch(new RegExp(`ON public\\.${t}\\b`));
    }
    // Each policy must gate on practitioner_patients consent flag
    expect(sql).toMatch(/practitioner_patients/);
    expect(sql).toMatch(/auth\.uid\(\)/);
  });
});

// Revised Prompt #91: tab architecture + view-mode toggle + Path C.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { defaultsForCredential } from '@/lib/practitioner/onboarding-defaults';
import { isNaturopathLikeCredential } from '@/lib/practitioner/taxonomy';

const REPO = path.resolve(__dirname, '..');

describe('defaultsForCredential', () => {
  it.each(['nd', 'dc', 'lac'])(
    '%s lands the practitioner on Naturopath tab + naturopathic patient view',
    (credential) => {
      const d = defaultsForCredential(credential);
      expect(d.default_active_tab).toBe('naturopath');
      expect(d.default_patient_view_mode).toBe('naturopathic');
    },
  );

  it.each(['md', 'do', 'np', 'pa', 'rd', 'other'])(
    '%s lands the practitioner on Practice tab + standard patient view',
    (credential) => {
      const d = defaultsForCredential(credential);
      expect(d.default_active_tab).toBe('practice');
      expect(d.default_patient_view_mode).toBe('standard');
    },
  );

  it('reuses the canonical naturopath-like predicate', () => {
    for (const c of ['nd', 'dc', 'lac']) {
      expect(isNaturopathLikeCredential(c)).toBe(true);
      expect(defaultsForCredential(c).default_active_tab).toBe('naturopath');
    }
  });
});

describe('Revised P91 file scaffold', () => {
  it.each([
    'src/components/practitioner/PortalShellRouter.tsx',
    'src/components/practitioner/PractitionerPortalShell.tsx',
    'src/components/practitioner/PracticeSidebar.tsx',
    'src/components/practitioner/NaturopathSidebar.tsx',
    'src/components/practitioner/PatientViewModeSelector.tsx',
    'src/components/practitioner/StandardPatientView.tsx',
    'src/components/practitioner/NaturopathicPatientView.tsx',
    'src/app/(app)/practitioner/patients/[id]/LegacyPatientView.tsx',
    'src/app/(app)/practitioner/patients/[id]/page.tsx',
    'src/app/api/practitioner/patient-view-preference/route.ts',
    'src/lib/practitioner/onboarding-defaults.ts',
  ])('component file present: %s', (p) => {
    expect(existsSync(path.join(REPO, p))).toBe(true);
  });
});

describe('Migration _180 shape', () => {
  const sql = readFileSync(
    path.join(REPO, 'supabase/migrations/20260418000180_revised_p91_view_modes_and_constitutional.sql'),
    'utf8',
  );

  it('adds default_patient_view_mode + default_active_tab to practitioners', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS default_patient_view_mode/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS default_active_tab/);
  });

  it('adds patient_view_mode_override to practitioner_patients', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS patient_view_mode_override/);
  });

  it('creates constitutional_assessments with RLS', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.constitutional_assessments/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/POLICY constitutional_patient_read/);
    expect(sql).toMatch(/POLICY constitutional_practitioner_read/);
    expect(sql).toMatch(/POLICY constitutional_practitioner_write/);
  });

  it('extends supplement_protocols with naturopathic columns', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS protocol_type/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS constitutional_framework/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS lifestyle_interventions/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS energetic_notes/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS botanical_components/);
  });

  it('is append-only', () => {
    expect(sql).not.toMatch(/DROP COLUMN/i);
    expect(sql).not.toMatch(/RENAME COLUMN/i);
  });
});

describe('Hygiene of new components', () => {
  it.each([
    'src/components/practitioner/PracticeSidebar.tsx',
    'src/components/practitioner/NaturopathSidebar.tsx',
    'src/components/practitioner/PractitionerPortalShell.tsx',
    'src/components/practitioner/PatientViewModeSelector.tsx',
    'src/components/practitioner/StandardPatientView.tsx',
    'src/components/practitioner/NaturopathicPatientView.tsx',
  ])('%s uses Lucide strokeWidth 1.5 and contains no em-dash', (p) => {
    const src = readFileSync(path.join(REPO, p), 'utf8');
    expect(src).toMatch(/strokeWidth=\{1\.5\}/);
    expect(src).not.toMatch(/—/);
  });
});

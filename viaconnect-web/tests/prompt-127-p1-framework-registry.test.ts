import { describe, it, expect } from 'vitest';
import {
  loadRegistry,
  getFramework,
  getControlPoint,
  activeFrameworkIds,
  populatedFrameworkIds,
} from '@/lib/compliance/frameworks/registry';
import {
  crosswalk,
  collectorsForControl,
  allControlsForCollector,
} from '@/lib/compliance/frameworks/crosswalk';
import { SOC2_FRAMEWORK, SOC2_CONTROL_POINTS } from '@/lib/compliance/frameworks/definitions/soc2';
import { FRAMEWORK_IDS, type FrameworkId } from '@/lib/compliance/frameworks/types';
import { SOC2_CATEGORY_DIRS, SOC2_TSC_CODES } from '@/lib/soc2/types';

describe('framework registry', () => {
  it('loads all three framework ids', () => {
    const reg = loadRegistry();
    expect(Object.keys(reg.frameworks).sort()).toEqual(['hipaa_security', 'iso_27001_2022', 'soc2']);
    expect(reg.registryVersion).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('every FRAMEWORK_IDS entry resolves via getFramework', () => {
    for (const fid of FRAMEWORK_IDS) {
      const def = getFramework(fid);
      expect(def.id).toBe(fid);
      expect(def.displayName.length).toBeGreaterThan(0);
      expect(def.attestationLanguage.length).toBeGreaterThan(50);
    }
  });

  it('throws on unknown framework id', () => {
    expect(() => getFramework('bogus' as FrameworkId)).toThrow(/unknown framework/);
  });

  it('activeFrameworkIds returns all three; populatedFrameworkIds grows as phases land', () => {
    expect(activeFrameworkIds().sort()).toEqual(['hipaa_security', 'iso_27001_2022', 'soc2']);
    // SOC 2 populated since P1, HIPAA since P3, ISO 27001 since P5.
    const populated = populatedFrameworkIds().sort();
    expect(populated).toContain('soc2');
    expect(populated).toContain('hipaa_security');
    expect(populated).toContain('iso_27001_2022');
  });
});

describe('SOC 2 framework definition', () => {
  it('has the expected attestor role', () => {
    expect(SOC2_FRAMEWORK.attestorRole).toBe('compliance_officer');
    expect(SOC2_FRAMEWORK.attestationType).toBe('type_ii');
  });

  it('category dirs match the hardcoded #122 SOC2_CATEGORY_DIRS', () => {
    expect(SOC2_FRAMEWORK.categoryDirs).toEqual(SOC2_CATEGORY_DIRS);
  });

  it('control points cover every TSC family that has an automated collector', () => {
    // Families with collectors today: CC4, CC5, CC6, CC7, CC8, CC9, A1, C1, P.
    // CC1, CC2, CC3 are governance-heavy and backed by manual evidence vault
    // entries rather than automated collectors; the registry does not need
    // automated control points for those in P1.
    const prefixes = new Set(SOC2_CONTROL_POINTS.map((c) => c.id.split('.')[0]));
    for (const code of ['CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9', 'A1', 'C1', 'P']) {
      expect(prefixes.has(code) || SOC2_CONTROL_POINTS.some((c) => c.id.startsWith(code)),
             `missing control family ${code}`).toBe(true);
    }
    // And SOC2_TSC_CODES is still the authoritative list of TSC codes used by #122.
    expect(SOC2_TSC_CODES.length).toBeGreaterThan(0);
  });

  it('every control point has at least one evidence source', () => {
    for (const c of SOC2_CONTROL_POINTS) {
      expect(c.evidenceSources.length, `${c.id} has no evidence sources`).toBeGreaterThan(0);
    }
  });

  it('every evidence source reference targets an existing #122 collector id', () => {
    // Hardcoded list matches the 26 collectors registered in runAll.ts
    const validCollectors = new Set([
      'marshall-findings-collector', 'marshall-incidents-collector', 'marshall-audit-chain-collector',
      'hounddog-signals-collector', 'hounddog-findings-collector',
      'precheck-sessions-collector', 'precheck-receipts-collector',
      'consent-ledger-collector', 'dsar-collector', 'vendor-baas-collector',
      'rls-policies-collector', 'migrations-collector', 'users-roles-collector',
      'privileged-actions-collector',
      'github-prs-collector', 'vercel-deployments-collector', 'anthropic-usage-collector',
      'supabase-advisor-collector', 'dependabot-collector', 'uptime-collector',
      'cert-expiry-collector', 'mfa-enforcement-collector', 'key-rotation-collector',
      'npi-reverify-collector',
      'counterfeit-determinations-collector',
      'scheduler-bridge-collector',
    ]);
    for (const c of SOC2_CONTROL_POINTS) {
      for (const src of c.evidenceSources) {
        expect(validCollectors.has(src), `${c.id} references unknown collector ${src}`).toBe(true);
      }
    }
  });

  it('every control point declares the standard narrator sections', () => {
    const expected = ['control_description', 'control_operation_summary', 'managements_response'];
    for (const c of SOC2_CONTROL_POINTS) {
      const kinds = c.narratorSections.map((s) => s.kind);
      expect(kinds).toEqual(expected);
    }
  });

  it('all control points are tagged framework=soc2', () => {
    for (const c of SOC2_CONTROL_POINTS) {
      expect(c.framework).toBe('soc2');
    }
  });
});

describe('getControlPoint', () => {
  it('finds a known SOC 2 control', () => {
    const match = getControlPoint('soc2', 'CC4.1');
    expect(match).not.toBeNull();
    expect(match?.control.name).toContain('Ongoing control monitoring');
  });

  it('returns null for unknown control id', () => {
    expect(getControlPoint('soc2', 'CC99.99')).toBeNull();
  });

  it('returns null for unknown ISO control id', () => {
    expect(getControlPoint('iso_27001_2022', 'A.999.999')).toBeNull();
  });
});

describe('crosswalk', () => {
  it('marshall-findings-collector maps to SOC 2 CC4.1, CC4.2, CC7.2', () => {
    const cw = crosswalk('marshall-findings-collector');
    expect(cw.soc2.sort()).toEqual(['CC4.1', 'CC4.2', 'CC7.2']);
    // HIPAA maps this collector via Risk Management and Info System Activity
    // Review safeguards since P3. ISO maps it to A.8.16 since P5.
    expect(cw.iso_27001_2022).toContain('A.8.16');
  });

  it('unknown collector returns empty lists', () => {
    const cw = crosswalk('does-not-exist');
    expect(cw.soc2).toEqual([]);
    expect(cw.hipaa_security).toEqual([]);
    expect(cw.iso_27001_2022).toEqual([]);
  });

  it('mfa-enforcement-collector maps only to CC6.1', () => {
    expect(crosswalk('mfa-enforcement-collector').soc2).toEqual(['CC6.1']);
  });

  it('consent-ledger-collector maps to all eight privacy criteria', () => {
    const cw = crosswalk('consent-ledger-collector');
    expect(cw.soc2.sort()).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
});

describe('collectorsForControl', () => {
  it('CC6.1 lists the logical-access collectors', () => {
    const collectors = collectorsForControl('soc2', 'CC6.1').sort();
    expect(collectors).toContain('rls-policies-collector');
    expect(collectors).toContain('mfa-enforcement-collector');
    expect(collectors).toContain('users-roles-collector');
  });

  it('unknown control returns empty list', () => {
    expect(collectorsForControl('soc2', 'CC99.99')).toEqual([]);
  });
});

describe('allControlsForCollector', () => {
  it('returns an entry per framework / control pair across populated frameworks', () => {
    const out = allControlsForCollector('marshall-findings-collector');
    const soc2Entries = out.filter((e) => e.framework === 'soc2');
    expect(soc2Entries.map((e) => e.controlId).sort()).toEqual(['CC4.1', 'CC4.2', 'CC7.2']);
    // ISO 27001 A.8.16 (Monitoring activities) consumes this collector since P5.
    const isoEntries = out.filter((e) => e.framework === 'iso_27001_2022');
    expect(isoEntries.map((e) => e.controlId)).toContain('A.8.16');
  });
});

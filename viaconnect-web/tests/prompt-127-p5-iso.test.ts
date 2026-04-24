import { describe, it, expect } from 'vitest';
import {
  ISO27001_FRAMEWORK,
  ISO27001_CONTROL_POINTS,
} from '@/lib/compliance/frameworks/definitions/iso27001';
import {
  loadRegistry,
  getControlPoint,
  populatedFrameworkIds,
} from '@/lib/compliance/frameworks/registry';
import { crosswalk, collectorsForControl } from '@/lib/compliance/frameworks/crosswalk';
import { ISO_COLLECTORS } from '@/lib/iso/collectors/runAll';
import type { CollectorQuery, CollectorRunCtx } from '@/lib/soc2/collectors/types';
import { frozenTimer } from '@/lib/soc2/collectors/helpers';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PACKET_UUID = '01J8ZP5V3K7000000000000011H';
const PERIOD = { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' };

// ─── ISO registry ────────────────────────────────────────────────────────

describe('ISO 27001 framework registry', () => {
  it('registry now lists all three frameworks as populated (P3 -> P5 transition)', () => {
    expect(populatedFrameworkIds().sort()).toEqual(['hipaa_security', 'iso_27001_2022', 'soc2']);
  });

  it('registry version bumped to v1.2.0 at P5', () => {
    expect(loadRegistry().registryVersion).toBe('v1.2.0');
  });

  it('ISO framework has the expected attestor role and type', () => {
    expect(ISO27001_FRAMEWORK.attestorRole).toBe('isms_manager');
    expect(ISO27001_FRAMEWORK.attestationType).toBe('certification_audit');
  });

  it('at least 90 Annex A control points are defined (target: 93)', () => {
    const annexCount = ISO27001_CONTROL_POINTS.filter((c) => c.id.startsWith('A.')).length;
    expect(annexCount).toBeGreaterThanOrEqual(90);
  });

  it('at least 15 ISMS clause control points are defined', () => {
    const clauseCount = ISO27001_CONTROL_POINTS.filter((c) => c.id.startsWith('Clause')).length;
    expect(clauseCount).toBeGreaterThanOrEqual(15);
  });

  it('every control point is tagged framework=iso_27001_2022', () => {
    for (const c of ISO27001_CONTROL_POINTS) {
      expect(c.framework).toBe('iso_27001_2022');
    }
  });

  it('every Annex A control has a defaultApplicability set', () => {
    for (const c of ISO27001_CONTROL_POINTS.filter((c) => c.id.startsWith('A.'))) {
      expect(c.defaultApplicability === 'applicable' || c.defaultApplicability === 'excluded').toBe(true);
    }
  });

  it('all 4 Annex A themes (5/6/7/8) are represented', () => {
    const cats = new Set(ISO27001_CONTROL_POINTS.map((c) => c.category));
    expect([...cats].some((c) => c.startsWith('Annex A.5'))).toBe(true);
    expect([...cats].some((c) => c.startsWith('Annex A.6'))).toBe(true);
    expect([...cats].some((c) => c.startsWith('Annex A.7'))).toBe(true);
    expect([...cats].some((c) => c.startsWith('Annex A.8'))).toBe(true);
  });

  it('Annex A controls get the 4-section narrator including SoA determination', () => {
    for (const c of ISO27001_CONTROL_POINTS.filter((c) => c.id.startsWith('A.'))) {
      const kinds = c.narratorSections.map((s) => s.kind);
      expect(kinds).toContain('control_objective');
      expect(kinds).toContain('implementation_description');
      expect(kinds).toContain('effectiveness_assessment');
      expect(kinds).toContain('soa_applicability_determination');
    }
  });

  it('ISMS clauses get the 3-section clause narrator (no SoA)', () => {
    for (const c of ISO27001_CONTROL_POINTS.filter((c) => c.id.startsWith('Clause'))) {
      const kinds = c.narratorSections.map((s) => s.kind);
      expect(kinds).toContain('clause_objective');
      expect(kinds).toContain('clause_implementation');
      expect(kinds).toContain('clause_effectiveness');
      expect(kinds).not.toContain('soa_applicability_determination');
    }
  });

  it('core ISO Annex A controls reference SOC 2 / HIPAA equivalents via crossFrameworkReferences', () => {
    const logging = ISO27001_CONTROL_POINTS.find((c) => c.id === 'A.8.15');
    expect(logging?.crossFrameworkReferences?.some((r) => r.framework === 'soc2' && r.controlId === 'CC4.3')).toBe(true);
    expect(logging?.crossFrameworkReferences?.some((r) => r.framework === 'hipaa_security' && r.controlId === 'CC4.3'.replace('CC4.3', '164.312(b)'))).toBe(true);

    const access = ISO27001_CONTROL_POINTS.find((c) => c.id === 'A.8.3');
    expect(access?.crossFrameworkReferences?.some((r) => r.framework === 'soc2' && r.controlId === 'CC6.1')).toBe(true);

    const supplier = ISO27001_CONTROL_POINTS.find((c) => c.id === 'A.5.19');
    expect(supplier?.crossFrameworkReferences?.some((r) => r.framework === 'hipaa_security' && r.controlId === '164.308(b)(1)')).toBe(true);
  });

  it('special artifacts include the mandatory ISO documents', () => {
    const ids = ISO27001_FRAMEWORK.specialArtifacts.map((a) => a.id);
    expect(ids).toContain('iso_statement_of_applicability');
    expect(ids).toContain('iso_isms_scope_document');
    expect(ids).toContain('iso_risk_assessment_report');
    expect(ids).toContain('iso_risk_treatment_plan');
  });

  it('getControlPoint resolves a known Annex A control', () => {
    const match = getControlPoint('iso_27001_2022', 'A.8.15');
    expect(match).not.toBeNull();
    expect(match?.control.name).toContain('Logging');
  });
});

// ─── Crosswalk (ISO now populated) ───────────────────────────────────────

describe('crosswalk - ISO populated', () => {
  it('marshall-audit-chain-collector now maps to ISO A.5.28 + A.8.15', () => {
    const cw = crosswalk('marshall-audit-chain-collector');
    expect(cw.iso_27001_2022).toContain('A.8.15');
    expect(cw.iso_27001_2022).toContain('A.5.28');
  });

  it('mfa-enforcement-collector maps to ISO A.5.15 + A.5.17 + A.8.2 + A.8.5', () => {
    const cw = crosswalk('mfa-enforcement-collector');
    expect(cw.iso_27001_2022).toContain('A.5.15');
    expect(cw.iso_27001_2022).toContain('A.5.17');
    expect(cw.iso_27001_2022).toContain('A.8.2');
    expect(cw.iso_27001_2022).toContain('A.8.5');
  });

  it('hounddog-signals-collector maps to ISO threat intelligence A.5.7 + monitoring A.8.16', () => {
    const cw = crosswalk('hounddog-signals-collector');
    expect(cw.iso_27001_2022).toContain('A.5.7');
    expect(cw.iso_27001_2022).toContain('A.8.16');
  });

  it('ISO-specific collector iso-soa-coverage-collector is not used by SOC 2 or HIPAA', () => {
    const cw = crosswalk('iso-soa-coverage-collector');
    expect(cw.soc2).toEqual([]);
    expect(cw.hipaa_security).toEqual([]);
    expect(cw.iso_27001_2022.length).toBeGreaterThan(0);
  });

  it('collectorsForControl resolves ISO A.8.15 to marshall-audit-chain-collector', () => {
    const cols = collectorsForControl('iso_27001_2022', 'A.8.15');
    expect(cols).toContain('marshall-audit-chain-collector');
  });
});

// ─── Collectors ───────────────────────────────────────────────────────────

function buildCtx(fixtures: Record<string, Array<Record<string, unknown>>>): CollectorRunCtx & { timer: ReturnType<typeof frozenTimer> } {
  return {
    packetUuid: PACKET_UUID,
    pseudonymKey: FIXED_KEY,
    ruleRegistryVersion: 'v4.3.7',
    timer: frozenTimer('2026-04-24T00:00:00Z', 42),
    async fetch<T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> {
      const rows = fixtures[q.table] ?? [];
      const filtered = rows.filter((r) => {
        for (const f of q.filters) {
          const v = r[f.column];
          switch (f.op) {
            case 'eq':  if (v !== f.value) return false; break;
            case 'gte': if (!(String(v) >= String(f.value))) return false; break;
            case 'lte': if (!(String(v) <= String(f.value))) return false; break;
            default: break;
          }
        }
        return true;
      });
      return filtered as T[];
    },
  };
}

describe('ISO collectors - registration + determinism', () => {
  it('ISO_COLLECTORS contains 6 collectors', () => {
    expect(ISO_COLLECTORS.length).toBe(6);
    const ids = new Set(ISO_COLLECTORS.map((c) => c.id));
    expect(ids.has('iso-soa-coverage-collector')).toBe(true);
    expect(ids.has('iso-risk-register-collector')).toBe(true);
    expect(ids.has('iso-internal-audit-collector')).toBe(true);
    expect(ids.has('iso-management-review-collector')).toBe(true);
    expect(ids.has('iso-nonconformity-collector')).toBe(true);
    expect(ids.has('iso-isms-scope-collector')).toBe(true);
  });

  it('every ISO collector id is unique', () => {
    const ids = ISO_COLLECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every ISO collector declares ISO control ids in controls[]', () => {
    for (const c of ISO_COLLECTORS) {
      for (const ctl of c.controls) {
        expect(ctl.match(/^(A\.|Clause |SoA)/)).not.toBeNull();
      }
    }
  });

  it('SoA coverage collector produces deterministic output across runs', async () => {
    const fixtures = {
      iso_statements_of_applicability: [
        {
          control_ref: 'A.8.15', version: 1, applicability: 'applicable',
          implementation_status: 'implemented',
          justification: 'Logging is core to the FarmCeutica SOC 2 controls and is fully in scope for the ISMS.',
          effective_from: '2026-01-01', effective_until: null, approved_at: '2026-01-15T00:00:00Z',
        },
        {
          control_ref: 'A.8.23', version: 1, applicability: 'excluded',
          implementation_status: 'not_applicable',
          justification: 'Web filtering is outside the ISMS scope as FarmCeutica does not operate a corporate network.',
          effective_from: '2026-01-01', effective_until: null, approved_at: '2026-01-15T00:00:00Z',
        },
      ],
    };
    const soa = ISO_COLLECTORS.find((c) => c.id === 'iso-soa-coverage-collector')!;
    const a = await soa.collect(PERIOD, buildCtx(fixtures));
    const b = await soa.collect(PERIOD, buildCtx(fixtures));
    expect(Buffer.from(a.files[0].bytes).equals(Buffer.from(b.files[0].bytes))).toBe(true);
    expect(JSON.stringify(a.attestation)).toBe(JSON.stringify(b.attestation));
  });

  it('risk register collector pseudonymizes owner', async () => {
    const fixtures = {
      iso_risk_register: [
        {
          risk_ref: 'R-2026-001', threat: 'Unauthorized access to PHI',
          vulnerability: 'Missing MFA on one admin account',
          likelihood: 3, impact: 4, inherent_risk: 12,
          treatment_option: 'modify',
          residual_likelihood: 1, residual_impact: 4, residual_risk: 4,
          status: 'treated',
          identified_at: '2026-01-10', next_review_date: '2026-07-10',
          owner: 'raw-owner-uuid-aaaaa',
        },
      ],
    };
    const risk = ISO_COLLECTORS.find((c) => c.id === 'iso-risk-register-collector')!;
    const result = await risk.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).not.toContain('raw-owner-uuid-aaaaa');
    expect(csv).toMatch(/[A-Z2-7]{26}/);
  });

  it('management review collector pseudonymizes signed_off_by', async () => {
    const fixtures = {
      iso_management_reviews: [
        {
          review_date: '2026-02-15',
          attendees: 'CEO, ISMS Manager, Security Officer, Compliance Officer',
          inputs_summary: 'Quarterly review of risk register, internal audit findings, and corrective actions.',
          decisions: [{ topic: 'risk register', decision: 'approved' }],
          action_items: [],
          storage_key: 'mgmt-reviews/2026-q1.pdf',
          signed_off_by: 'raw-signer-uuid-bbbbb',
          signed_off_at: '2026-02-16T10:00:00Z',
        },
      ],
    };
    const mgmt = ISO_COLLECTORS.find((c) => c.id === 'iso-management-review-collector')!;
    const result = await mgmt.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).not.toContain('raw-signer-uuid-bbbbb');
    expect(csv).toMatch(/[A-Z2-7]{26}/);
  });

  it('all 6 collectors produce non-empty CSVs when fixtures are present', async () => {
    const today = '2026-02-10';
    const fixtures: Record<string, Array<Record<string, unknown>>> = {
      iso_statements_of_applicability: [{
        control_ref: 'A.5.1', version: 1, applicability: 'applicable',
        implementation_status: 'implemented',
        justification: 'Information security policy approved and published in the ISMS.',
        effective_from: '2026-01-01', effective_until: null, approved_at: '2026-01-15T00:00:00Z',
      }],
      iso_risk_register: [{
        risk_ref: 'R-2026-002', threat: 'Data leakage', vulnerability: 'Unencrypted backups',
        likelihood: 2, impact: 5, inherent_risk: 10,
        treatment_option: 'modify',
        residual_likelihood: 1, residual_impact: 5, residual_risk: 5,
        status: 'open', identified_at: today, next_review_date: '2026-07-10',
        owner: null,
      }],
      iso_internal_audits: [{
        audit_ref: 'IA-2026-01', audit_date: today, scope: 'A.8 Technological controls',
        auditor: 'Jane Doe', auditor_is_independent: true,
        major_findings_count: 0, minor_findings_count: 2, observations_count: 3,
        summary: 'Internal audit covering Annex A.8 with minor findings documented and tracked.',
        storage_key: 'audits/IA-2026-01.pdf',
      }],
      iso_management_reviews: [{
        review_date: today, attendees: 'CEO, ISMS Manager, Security Officer',
        inputs_summary: 'Review of risk, audit, corrective actions.',
        decisions: [], action_items: [],
        storage_key: null, signed_off_by: null, signed_off_at: null,
      }],
      iso_nonconformities: [{
        nc_ref: 'NC-2026-001', source: 'internal_audit', severity: 'minor',
        status: 'action_planned',
        description: 'Missing review date on one SoA entry.',
        root_cause: 'Missed during cutover.', corrective_action: 'Review all SoA entries quarterly.',
        target_date: '2026-05-01', actual_closure_date: null,
        recorded_at: `${today}T14:00:00Z`,
        verified_by: null, verified_at: null,
      }],
      iso_isms_scope_documents: [{
        version: 1,
        scope_description: 'FarmCeutica Wellness LLC production ISMS covering the ViaConnect platform and associated corporate IT.',
        included_boundaries: ['Production Supabase', 'Vercel deployments', 'GitHub org'],
        exclusions: ['Non-production training environment'],
        effective_from: '2026-01-01', effective_until: null,
        approved_at: '2026-01-15T00:00:00Z',
      }],
    };
    for (const collector of ISO_COLLECTORS) {
      const r = await collector.collect(PERIOD, buildCtx(fixtures));
      expect(r.files.length).toBeGreaterThanOrEqual(1);
      expect(r.attestation.rowCount).toBeGreaterThanOrEqual(1);
    }
  });
});

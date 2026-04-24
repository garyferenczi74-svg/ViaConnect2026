import { describe, it, expect } from 'vitest';
import {
  HIPAA_FRAMEWORK,
  HIPAA_CONTROL_POINTS,
} from '@/lib/compliance/frameworks/definitions/hipaa';
import {
  loadRegistry,
  populatedFrameworkIds,
} from '@/lib/compliance/frameworks/registry';
import { crosswalk } from '@/lib/compliance/frameworks/crosswalk';
import { HIPAA_COLLECTORS } from '@/lib/hipaa/collectors/runAll';
import type { CollectorQuery, CollectorRunCtx } from '@/lib/soc2/collectors/types';
import { frozenTimer } from '@/lib/soc2/collectors/helpers';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PACKET_UUID = '01J8ZP5V3K7000000000000011H';
const PERIOD = { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' };

// ─── HIPAA registry ────────────────────────────────────────────────────────

describe('HIPAA framework registry', () => {
  it('registry includes HIPAA and SOC 2 among populated frameworks (post-P3)', () => {
    const populated = populatedFrameworkIds().sort();
    expect(populated).toContain('soc2');
    expect(populated).toContain('hipaa_security');
  });

  it('registry version is at P3 or later (>= v1.1.0)', () => {
    const reg = loadRegistry();
    // P3 bumped to v1.1.0; P5 bumped to v1.2.0. Either is acceptable here.
    expect(reg.registryVersion).toMatch(/^v1\.[12]\.0$/);
  });

  it('HIPAA definition has the expected attestor role and type', () => {
    expect(HIPAA_FRAMEWORK.attestorRole).toBe('security_officer');
    expect(HIPAA_FRAMEWORK.attestationType).toBe('continuous_with_annual_risk_analysis');
  });

  it('at least 50 HIPAA control points are defined', () => {
    expect(HIPAA_CONTROL_POINTS.length).toBeGreaterThanOrEqual(50);
  });

  it('every control point is tagged framework=hipaa_security', () => {
    for (const c of HIPAA_CONTROL_POINTS) {
      expect(c.framework).toBe('hipaa_security');
    }
  });

  it('every control point has requiredOrAddressable set', () => {
    for (const c of HIPAA_CONTROL_POINTS) {
      expect(c.requiredOrAddressable === 'required' || c.requiredOrAddressable === 'addressable').toBe(true);
    }
  });

  it('every control cites 45 CFR in the canonical form 164.xxx...', () => {
    for (const c of HIPAA_CONTROL_POINTS) {
      expect(c.id).toMatch(/^164\.(308|310|312|314|316)/);
    }
  });

  it('administrative, physical, technical, organizational, documentation categories all present', () => {
    const cats = new Set(HIPAA_CONTROL_POINTS.map((c) => c.category));
    expect([...cats].some((c) => c.startsWith('Administrative'))).toBe(true);
    expect([...cats].some((c) => c.startsWith('Physical'))).toBe(true);
    expect([...cats].some((c) => c.startsWith('Technical'))).toBe(true);
    expect([...cats].some((c) => c.startsWith('Organizational'))).toBe(true);
    expect([...cats].some((c) => c.startsWith('Documentation'))).toBe(true);
  });

  it('Required safeguards use the 3-section narrator; Addressable use 4', () => {
    for (const c of HIPAA_CONTROL_POINTS) {
      if (c.requiredOrAddressable === 'required') {
        expect(c.narratorSections.length).toBe(3);
      } else {
        expect(c.narratorSections.length).toBe(4);
        expect(c.narratorSections.map((s) => s.kind)).toContain('addressable_safeguard_determination');
      }
    }
  });

  it('core HIPAA safeguards reference SOC 2 equivalents via crossFrameworkReferences', () => {
    const accessControl = HIPAA_CONTROL_POINTS.find((c) => c.id === '164.312(a)(1)');
    expect(accessControl?.crossFrameworkReferences?.some((r) => r.controlId === 'CC6.1')).toBe(true);

    const auditControls = HIPAA_CONTROL_POINTS.find((c) => c.id === '164.312(b)');
    expect(auditControls?.crossFrameworkReferences?.some((r) => r.controlId === 'CC4.1')).toBe(true);

    const baaControls = HIPAA_CONTROL_POINTS.find((c) => c.id === '164.308(b)(1)');
    expect(baaControls?.crossFrameworkReferences?.some((r) => r.controlId === 'CC9.2')).toBe(true);
  });

  it('special artifacts include the 3 required HIPAA documents', () => {
    const ids = HIPAA_FRAMEWORK.specialArtifacts.map((a) => a.id);
    expect(ids).toContain('hipaa_risk_analysis');
    expect(ids).toContain('hipaa_sanction_policy');
    expect(ids).toContain('hipaa_contingency_plan');
  });
});

// ─── Crosswalk (now with HIPAA populated) ─────────────────────────────────

describe('crosswalk — HIPAA populated', () => {
  it('marshall-audit-chain-collector now maps to HIPAA 164.312(b) Audit Controls', () => {
    const cw = crosswalk('marshall-audit-chain-collector');
    expect(cw.hipaa_security).toContain('164.312(b)');
  });

  it('mfa-enforcement-collector maps to HIPAA 164.312(d) Person or Entity Authentication', () => {
    const cw = crosswalk('mfa-enforcement-collector');
    expect(cw.hipaa_security).toContain('164.312(d)');
  });

  it('vendor-baas-collector maps to HIPAA 164.308(b)(1) + 164.314(a)(1)', () => {
    const cw = crosswalk('vendor-baas-collector');
    expect(cw.hipaa_security).toContain('164.308(b)(1)');
    expect(cw.hipaa_security).toContain('164.314(a)(1)');
  });

  it('HIPAA-specific collector breach maps to HIPAA breach notification controls', () => {
    const cw = crosswalk('hipaa-breach-determinations-collector');
    expect(cw.hipaa_security).toContain('164.308(a)(6)(ii)');
    expect(cw.soc2).toEqual([]); // HIPAA-only collector
  });
});

// ─── Collectors (deterministic output) ────────────────────────────────────

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

describe('HIPAA collectors — registration + determinism', () => {
  it('HIPAA_COLLECTORS contains 5 collectors', () => {
    expect(HIPAA_COLLECTORS.length).toBe(5);
    const ids = new Set(HIPAA_COLLECTORS.map((c) => c.id));
    expect(ids.has('hipaa-breach-determinations-collector')).toBe(true);
    expect(ids.has('hipaa-workforce-training-collector')).toBe(true);
    expect(ids.has('hipaa-contingency-plan-test-collector')).toBe(true);
    expect(ids.has('hipaa-emergency-access-collector')).toBe(true);
    expect(ids.has('hipaa-device-media-control-collector')).toBe(true);
  });

  it('every HIPAA collector id is unique', () => {
    const ids = HIPAA_COLLECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every HIPAA collector declares HIPAA control ids in controls[]', () => {
    for (const c of HIPAA_COLLECTORS) {
      for (const control of c.controls) {
        expect(control).toMatch(/^164\.(308|310|312|314|316|40[24-8])/);
      }
    }
  });

  it('breach collector produces deterministic output across runs', async () => {
    const fixtures = {
      hipaa_breach_determinations: [
        {
          incident_id: 'i-1', assessment_date: '2026-02-15',
          determination: 'low_probability_of_compromise',
          rationale: 'Encryption in transit held; no evidence of exfiltration',
          notification_required: false,
          individuals_affected_count: null,
          notification_sent_at: null,
          ocr_notification_sent_at: null,
          media_notification_sent_at: null,
        },
      ],
    };
    const a = await HIPAA_COLLECTORS[0].collect(PERIOD, buildCtx(fixtures));
    const b = await HIPAA_COLLECTORS[0].collect(PERIOD, buildCtx(fixtures));
    expect(Buffer.from(a.files[0].bytes).equals(Buffer.from(b.files[0].bytes))).toBe(true);
    expect(JSON.stringify(a.attestation)).toBe(JSON.stringify(b.attestation));
  });

  it('emergency-access collector pseudonymizes invoked_by and reviewed_by', async () => {
    const fixtures = {
      hipaa_emergency_access_invocations: [
        {
          invoked_at: '2026-02-10T03:00:00Z',
          invoked_by: 'raw-user-uuid-aaaaa',
          justification: 'Emergency production access to investigate incident INC-42',
          scope_of_access: 'read-only access to PHI database for 4 hours',
          reviewed_by: 'raw-user-uuid-bbbbb',
          reviewed_at: '2026-02-10T08:00:00Z',
          closed_at: '2026-02-10T09:00:00Z',
        },
      ],
    };
    const emergency = HIPAA_COLLECTORS.find((c) => c.id === 'hipaa-emergency-access-collector')!;
    const result = await emergency.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).not.toContain('raw-user-uuid-aaaaa');
    expect(csv).not.toContain('raw-user-uuid-bbbbb');
    // 26-char base32 pseudonyms should appear in the output.
    expect(csv).toMatch(/[A-Z2-7]{26}/);
  });

  it('all 5 collectors produce non-empty CSVs when fixtures are present', async () => {
    const fixtures: Record<string, Array<Record<string, unknown>>> = {
      hipaa_breach_determinations: [{
        incident_id: 'i-1', assessment_date: '2026-02-15',
        determination: 'not_applicable', rationale: 'Not PHI',
        notification_required: false, individuals_affected_count: null,
        notification_sent_at: null, ocr_notification_sent_at: null, media_notification_sent_at: null,
      }],
      hipaa_workforce_training: [{
        workforce_member_pseudonym: 'PSEUDO-ABC',
        training_module: 'Annual HIPAA Privacy & Security',
        completion_date: '2026-02-01',
        expiry_date: '2027-02-01',
        score_percent: 92,
      }],
      hipaa_contingency_plan_tests: [{
        test_date: '2026-02-20',
        test_kind: 'full_tabletop_exercise',
        scope: 'Production Supabase + Vercel application', outcome_summary: 'Passed',
        corrective_actions: [],
      }],
      hipaa_emergency_access_invocations: [{
        invoked_at: '2026-03-01T14:00:00Z',
        invoked_by: 'user-1', justification: 'Emergency access for investigation',
        scope_of_access: '30 minutes PHI read-only',
        reviewed_by: null, reviewed_at: null, closed_at: '2026-03-01T14:30:00Z',
      }],
      hipaa_device_media_events: [{
        event_date: '2026-02-05', event_kind: 'disposed',
        device_id: 'LAPTOP-0042', method: 'NIST SP 800-88 Purge',
        notes: 'Retired laptop',
      }],
    };
    for (const collector of HIPAA_COLLECTORS) {
      const r = await collector.collect(PERIOD, buildCtx(fixtures));
      expect(r.files.length).toBeGreaterThanOrEqual(1);
      expect(r.attestation.rowCount).toBeGreaterThanOrEqual(1);
    }
  });
});

/**
 * Unit tests for safetyInterlocks.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208, Phase 4, Task 11 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We import the module under test. The file does not exist yet (RED phase).
import { runInterlocks, type ProtocolCandidate, type InterlockContext } from '../safetyInterlocks';

// ---------------------------------------------------------------------------
// Minimal SnpProtocolRule fixture helpers
// ---------------------------------------------------------------------------

function makeContraindicateRule(rsid: string, flaggedForm: string, avoidList: string[] = []) {
  return {
    id: `rule-${rsid}`,
    rsid,
    gene: 'TEST',
    genotype_match: '',
    action_type: 'contraindicate' as const,
    flagged_form: flaggedForm,
    avoid_list: avoidList,
    review_status: 'published' as const,
    created_at: '2026-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Shared clean context baseline
// ---------------------------------------------------------------------------

function cleanCtx(overrides: Partial<InterlockContext> = {}): InterlockContext {
  return {
    userRiskRsids: [],
    rules: [],
    currentStack: [],
    currentSupplements: [],
    medications: [],
    cypStatusMap: {},
    consentedSensitiveTopics: [],
    disclaimerVersion: 'v2026-06',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1: HFE carrier / iron contraindication (interlock 1)
// ---------------------------------------------------------------------------

describe('Interlock 1: contraindication', () => {
  it('drops an HFE carrier proposed iron (standard amount)', () => {
    const candidate: ProtocolCandidate = {
      label: 'iron',
      nutrient: 'iron',
      amount: 18,
      supplementName: 'Iron Supplement',
    };
    const ctx = cleanCtx({
      userRiskRsids: ['rs1800562'],
      rules: [makeContraindicateRule('rs1800562', 'iron', ['iron supplements'])],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.droppedReason).toBe('contraindication');
      expect(result.detail).toBeTruthy();
    }
  });

  it('drops HFE carrier even when amount is tiny (1mg) and no interactions', () => {
    const candidate: ProtocolCandidate = {
      label: 'iron',
      nutrient: 'iron',
      amount: 1,
    };
    const ctx = cleanCtx({
      userRiskRsids: ['rs1800562'],
      rules: [makeContraindicateRule('rs1800562', 'iron')],
      // No medications, no supplements -> zero interactions possible
      medications: [],
      currentSupplements: [],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.droppedReason).toBe('contraindication');
    }
  });

  it('drops when candidate label appears in avoid_list of a matching rule', () => {
    const candidate: ProtocolCandidate = {
      label: 'iron supplements',
      nutrient: 'iron',
      amount: 10,
    };
    const ctx = cleanCtx({
      userRiskRsids: ['rs1800562'],
      rules: [makeContraindicateRule('rs1800562', 'ferrous-sulfate', ['iron supplements'])],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.droppedReason).toBe('contraindication');
    }
  });
});

// ---------------------------------------------------------------------------
// Test 2: Upper intake ceiling (interlock 2)
// ---------------------------------------------------------------------------

describe('Interlock 2: upper_limit', () => {
  it('drops when proposed + current stack exceeds UL for iron', () => {
    // IOM UL for iron = 45 mg. currentStack=10mg + proposed 40mg = 50mg > 45mg
    const candidate: ProtocolCandidate = {
      label: 'iron',
      nutrient: 'iron',
      amount: 40,
    };
    const ctx = cleanCtx({
      // No contraindicate rule - must reach interlock 2
      userRiskRsids: [],
      rules: [],
      currentStack: [{ nutrient: 'iron', amount: 10 }],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.droppedReason).toBe('upper_limit');
    }
  });

  it('passes when amount is below UL', () => {
    // 10 + 20 = 30 < 45
    const candidate: ProtocolCandidate = {
      label: 'iron',
      nutrient: 'iron',
      amount: 20,
    };
    const ctx = cleanCtx({
      currentStack: [{ nutrient: 'iron', amount: 10 }],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Interaction engine (interlock 3)
// ---------------------------------------------------------------------------

describe('Interlock 3: interaction', () => {
  it('drops when candidate supplement + medication produce a critical interaction', () => {
    // MTHFR+ + methotrexate = critical per INTERACTION_DB
    const candidate: ProtocolCandidate = {
      label: 'MTHFR+ Methylation Support',
      supplementName: 'MTHFR+',
    };
    const ctx = cleanCtx({
      medications: ['methotrexate'],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.droppedReason).toBe('interaction');
    }
  });

  it('does not drop on a warning-level interaction (only critical blocks)', () => {
    // FOCUS+ + ssri = warning, not critical
    const candidate: ProtocolCandidate = {
      label: 'FOCUS+ Focus Blend',
      supplementName: 'FOCUS+',
    };
    const ctx = cleanCtx({
      medications: ['ssri'],
    });
    const result = runInterlocks(candidate, ctx);
    // Should pass interlock 3 (warning-level interactions do not block)
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Sensitive-variant consent gate (interlock 4)
// ---------------------------------------------------------------------------

describe('Interlock 4: sensitive_consent', () => {
  it('drops when sensitiveTopic is set and not in consentedSensitiveTopics', () => {
    const candidate: ProtocolCandidate = {
      label: 'APOE+ Lipid Support',
      supplementName: 'APOE+',
      sensitiveTopic: 'apoe',
    };
    const ctx = cleanCtx({
      consentedSensitiveTopics: [],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.droppedReason).toBe('sensitive_consent');
    }
  });

  it('passes when sensitiveTopic matches a consented topic and candidate is otherwise clean', () => {
    const candidate: ProtocolCandidate = {
      label: 'APOE+ Lipid Support',
      supplementName: 'APOE+',
      sensitiveTopic: 'apoe',
    };
    const ctx = cleanCtx({
      consentedSensitiveTopics: ['apoe'],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Clean / happy path (all 5 interlocks pass)
// ---------------------------------------------------------------------------

describe('Clean candidate (all interlocks pass)', () => {
  it('returns passed:true with the disclaimerVersion echoed', () => {
    const candidate: ProtocolCandidate = {
      label: 'Vitamin C',
      nutrient: 'vitamin_c',
      amount: 500,
    };
    const ctx = cleanCtx({
      disclaimerVersion: 'v2026-06',
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.disclaimerVersion).toBe('v2026-06');
    }
  });
});

// ---------------------------------------------------------------------------
// Test 6: Order - contraindication wins over upper_limit
// ---------------------------------------------------------------------------

describe('Interlock order: contraindication wins over upper_limit', () => {
  it('drops with contraindication when BOTH interlock 1 and 2 would fail', () => {
    // Iron: HFE carrier (interlock 1) AND exceeds UL 10+40=50>45 (interlock 2)
    const candidate: ProtocolCandidate = {
      label: 'iron',
      nutrient: 'iron',
      amount: 40,
    };
    const ctx = cleanCtx({
      userRiskRsids: ['rs1800562'],
      rules: [makeContraindicateRule('rs1800562', 'iron')],
      currentStack: [{ nutrient: 'iron', amount: 10 }],
    });
    const result = runInterlocks(candidate, ctx);
    expect(result.passed).toBe(false);
    if (!result.passed) {
      // Interlock 1 must win
      expect(result.droppedReason).toBe('contraindication');
    }
  });
});

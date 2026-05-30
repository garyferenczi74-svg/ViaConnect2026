// Tests for body-scan-model-versions.ts (Prompt #169b, Task 19, spec section
// 7.3 / 7.4 inclusivity waitlist + section 16.5 model-version badge).
//
// These exercise the REAL pure logic behind:
//   * the inclusivity waitlist upsert payload + conflict semantics (a repeat
//     opt-in must be insert-on-conflict-do-nothing, keyed on the unique user_id);
//   * the model-version badge decision (show on an older scan whose version
//     differs from current; hidden on a current scan; "v0" sentinel for an
//     unstamped legacy scan);
//   * the current-version constant being CENTRALIZED here (one source of truth).
//
// Node environment pure logic tests (project convention).

import { describe, it, expect } from 'vitest';
import {
  CURRENT_MODEL_VERSIONS,
  PRIMARY_MODEL_VERSION_KEY,
  LEGACY_MODEL_VERSION_TOKEN,
  buildModelVersionStamp,
  modelVersionToken,
  currentModelVersionToken,
  decideModelVersionBadge,
  buildWaitlistInsertPayload,
  buildWaitlistUpsertOptions,
  type ModelVersionStamp,
} from '@/lib/body-tracker/body-scan-model-versions';

// ===========================================================================
// Centralization (section 16.5): one source of truth for engine versions
// ===========================================================================

describe('CURRENT_MODEL_VERSIONS (centralized constant)', () => {
  it('stamps the four real pipeline engines (landmark, composition, calibration, measurement)', () => {
    expect(Object.keys(CURRENT_MODEL_VERSIONS).sort()).toEqual(
      ['calibration', 'composition_engine', 'landmark', 'measurement'].sort(),
    );
  });

  it('uses the spec composition identifier navy+cunbae+visual-v1', () => {
    // The composition engine is the headline engine; its identifier mirrors
    // compositionBlender.ts (Navy + CUN-BAE + Arnold visual blend).
    expect(CURRENT_MODEL_VERSIONS.composition_engine).toBe('navy+cunbae+visual-v1');
  });

  it('every engine carries a non-empty version string', () => {
    for (const v of Object.values(CURRENT_MODEL_VERSIONS)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it('the primary key is the composition engine and is present in the constant', () => {
    expect(PRIMARY_MODEL_VERSION_KEY).toBe('composition_engine');
    expect(CURRENT_MODEL_VERSIONS[PRIMARY_MODEL_VERSION_KEY]).toBeDefined();
  });
});

describe('buildModelVersionStamp (persist stamp)', () => {
  it('returns the current versions', () => {
    expect(buildModelVersionStamp()).toEqual({ ...CURRENT_MODEL_VERSIONS });
  });

  it('returns a FRESH object, not the frozen constant (callers may extend it)', () => {
    const stamp = buildModelVersionStamp();
    expect(stamp).not.toBe(CURRENT_MODEL_VERSIONS as unknown as ModelVersionStamp);
    // Mutating the result must not affect the source of truth.
    stamp.landmark = 'mutated';
    expect(CURRENT_MODEL_VERSIONS.landmark).toBe('mediapipe-pose-lite-v1');
  });
});

// ===========================================================================
// Version token extraction
// ===========================================================================

describe('modelVersionToken', () => {
  it('derives the trailing vN from the primary (composition) identifier', () => {
    expect(modelVersionToken({ composition_engine: 'navy+cunbae+visual-v1' })).toBe('v1');
  });

  it('prefers the composition engine over other keys when present', () => {
    expect(
      modelVersionToken({
        landmark: 'mediapipe-pose-lite-v2',
        composition_engine: 'navy+cunbae+visual-v1',
      }),
    ).toBe('v1');
  });

  it('falls back to the first available value when no composition key', () => {
    expect(modelVersionToken({ landmark: 'mediapipe-pose-lite-v3' })).toBe('v3');
  });

  it('returns the whole identifier when it has no trailing vN', () => {
    expect(modelVersionToken({ composition_engine: 'experimental-engine' })).toBe('experimental-engine');
  });

  it('returns null for an empty stamp', () => {
    expect(modelVersionToken({})).toBeNull();
  });

  it('returns null for null / undefined', () => {
    expect(modelVersionToken(null)).toBeNull();
    expect(modelVersionToken(undefined)).toBeNull();
  });

  it('currentModelVersionToken is v1 for the shipped engine set', () => {
    expect(currentModelVersionToken()).toBe('v1');
  });
});

// ===========================================================================
// Badge decision (section 16.5): show on older/different, hide on current
// ===========================================================================

describe('decideModelVersionBadge', () => {
  it('hides the badge for a scan on the CURRENT version (no clutter on fresh scans)', () => {
    const decision = decideModelVersionBadge({ ...CURRENT_MODEL_VERSIONS });
    expect(decision.show).toBe(false);
    expect(decision.scanToken).toBe('v1');
    expect(decision.currentToken).toBe('v1');
  });

  it('shows the badge for an OLDER scan whose version differs from current', () => {
    const decision = decideModelVersionBadge({ composition_engine: 'navy+cunbae+visual-v0' });
    expect(decision.show).toBe(true);
    expect(decision.scanToken).toBe('v0');
    expect(decision.currentToken).toBe('v1');
  });

  it('shows the badge for a NEWER scan that differs (defensive: any difference badges)', () => {
    const decision = decideModelVersionBadge({ composition_engine: 'navy+cunbae+visual-v2' });
    expect(decision.show).toBe(true);
    expect(decision.scanToken).toBe('v2');
  });

  it('treats a scan with NO stamp ({} default) as legacy and shows the v0 sentinel', () => {
    const decision = decideModelVersionBadge({});
    expect(decision.show).toBe(true);
    expect(decision.scanToken).toBe(LEGACY_MODEL_VERSION_TOKEN);
    expect(decision.scanToken).toBe('v0');
  });

  it('treats null / undefined model_versions as legacy and shows the v0 sentinel', () => {
    for (const stamp of [null, undefined]) {
      const decision = decideModelVersionBadge(stamp);
      expect(decision.show).toBe(true);
      expect(decision.scanToken).toBe('v0');
    }
  });

  it('the current token in the decision matches the centralized constant', () => {
    expect(decideModelVersionBadge(null).currentToken).toBe(currentModelVersionToken());
  });
});

// ===========================================================================
// Inclusivity waitlist payload (section 7.4)
// ===========================================================================

describe('buildWaitlistInsertPayload', () => {
  const USER = 'user-123';

  it('shapes a full opt-in (capability + notes + notify)', () => {
    expect(
      buildWaitlistInsertPayload(USER, {
        requestedCapability: 'seated',
        notes: '  uses a wheelchair  ',
        notifyEmail: true,
      }),
    ).toEqual({
      user_id: USER,
      requested_capability: 'seated',
      notes: 'uses a wheelchair', // trimmed
      notify_email: true,
    });
  });

  it('allows a bare opt-in with NO capability (section 7.4: capability optional)', () => {
    expect(buildWaitlistInsertPayload(USER)).toEqual({
      user_id: USER,
      requested_capability: null,
      notes: null,
      notify_email: true, // default true
    });
  });

  it('notify_email defaults to true and only an explicit false turns it off', () => {
    expect(buildWaitlistInsertPayload(USER, { notifyEmail: false }).notify_email).toBe(false);
    // Any non-false (including undefined) yields true.
    expect(buildWaitlistInsertPayload(USER, {}).notify_email).toBe(true);
    expect(buildWaitlistInsertPayload(USER, { notifyEmail: true }).notify_email).toBe(true);
  });

  it('empty / whitespace notes collapse to null (no blank-string rows)', () => {
    expect(buildWaitlistInsertPayload(USER, { notes: '' }).notes).toBeNull();
    expect(buildWaitlistInsertPayload(USER, { notes: '   ' }).notes).toBeNull();
    expect(buildWaitlistInsertPayload(USER, { notes: null }).notes).toBeNull();
  });

  it('a null capability is preserved as null (not coerced to a string)', () => {
    expect(buildWaitlistInsertPayload(USER, { requestedCapability: null }).requested_capability).toBeNull();
  });

  it('carries the user_id (the unique conflict key) on the payload', () => {
    expect(buildWaitlistInsertPayload(USER, { requestedCapability: 'single_arm' }).user_id).toBe(USER);
  });
});

describe('buildWaitlistUpsertOptions (insert-on-conflict-do-nothing)', () => {
  it('conflicts on user_id and IGNORES duplicates (a repeat opt-in is a no-op, not an error)', () => {
    expect(buildWaitlistUpsertOptions()).toEqual({
      onConflict: 'user_id',
      ignoreDuplicates: true,
    });
  });

  it('keeps the unique key aligned with the migration UNIQUE(user_id) constraint', () => {
    // The body_scan_inclusivity_waitlist table (migration 20260516000070) has
    // UNIQUE(user_id); the upsert conflict target MUST be exactly that column so
    // the second opt-in keeps the first request rather than failing.
    expect(buildWaitlistUpsertOptions().onConflict).toBe('user_id');
  });
});

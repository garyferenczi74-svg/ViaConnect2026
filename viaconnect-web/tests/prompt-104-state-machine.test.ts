// Prompt #104 Phase 1: Case state-machine tests.
// Mirrors the lifecycle in spec §4.1.

import { describe, it, expect } from 'vitest';
import { canTransition, validateTransition } from '@/lib/legal/caseStateMachine';

describe('canTransition', () => {
  it('rejects identical-state transitions', () => {
    expect(canTransition({ from: 'intake', to: 'intake' })).toEqual({
      ok: false, reason: 'identical_state',
    });
  });

  it('allows intake -> triage_ai', () => {
    expect(canTransition({ from: 'intake', to: 'triage_ai' })).toEqual({ ok: true });
  });

  it('blocks intake -> active_enforcement (must triage first)', () => {
    expect(canTransition({ from: 'intake', to: 'active_enforcement' }))
      .toEqual({ ok: false, reason: 'transition_not_permitted' });
  });

  it('allows triage_ai -> pending_human_triage', () => {
    expect(canTransition({ from: 'triage_ai', to: 'pending_human_triage' })).toEqual({ ok: true });
  });

  it('allows triage_ai -> pending_medical_director_review', () => {
    expect(canTransition({ from: 'triage_ai', to: 'pending_medical_director_review' })).toEqual({ ok: true });
  });

  it('blocks pending_human_triage -> active_enforcement (must classify first)', () => {
    expect(canTransition({ from: 'pending_human_triage', to: 'active_enforcement' }))
      .toEqual({ ok: false, reason: 'transition_not_permitted' });
  });

  it('allows pending_medical_director_review -> classified', () => {
    expect(canTransition({ from: 'pending_medical_director_review', to: 'classified' })).toEqual({ ok: true });
  });

  it('allows classified -> active_enforcement', () => {
    expect(canTransition({ from: 'classified', to: 'active_enforcement' })).toEqual({ ok: true });
  });

  it('allows classified -> escalated_to_outside_counsel (skipping enforcement)', () => {
    expect(canTransition({ from: 'classified', to: 'escalated_to_outside_counsel' })).toEqual({ ok: true });
  });

  it('blocks classified -> escalated_to_litigation (must go via outside counsel or active enforcement)', () => {
    expect(canTransition({ from: 'classified', to: 'escalated_to_litigation' }))
      .toEqual({ ok: false, reason: 'transition_not_permitted' });
  });

  it('allows active_enforcement -> all four resolution states', () => {
    for (const target of [
      'resolved_successful',
      'resolved_unsuccessful',
      'escalated_to_outside_counsel',
      'escalated_to_litigation',
    ] as const) {
      expect(canTransition({ from: 'active_enforcement', to: target })).toEqual({ ok: true });
    }
  });

  it('allows escalated_to_outside_counsel -> escalated_to_litigation', () => {
    expect(canTransition({ from: 'escalated_to_outside_counsel', to: 'escalated_to_litigation' }))
      .toEqual({ ok: true });
  });

  it('blocks escalated_to_litigation -> active_enforcement (no de-escalation back)', () => {
    expect(canTransition({ from: 'escalated_to_litigation', to: 'active_enforcement' }))
      .toEqual({ ok: false, reason: 'transition_not_permitted' });
  });

  it('archived is terminal (rejects all outbound)', () => {
    expect(canTransition({ from: 'archived', to: 'intake' }))
      .toEqual({ ok: false, reason: 'transition_not_permitted' });
    expect(canTransition({ from: 'archived', to: 'classified' }))
      .toEqual({ ok: false, reason: 'transition_not_permitted' });
  });

  it('resolved_successful flows only to archived', () => {
    expect(canTransition({ from: 'resolved_successful', to: 'archived' })).toEqual({ ok: true });
    expect(canTransition({ from: 'resolved_successful', to: 'active_enforcement' }))
      .toEqual({ ok: false, reason: 'transition_not_permitted' });
  });
});

describe('validateTransition', () => {
  it('throws on invalid transition', () => {
    expect(() => validateTransition({ from: 'intake', to: 'archived' })).toThrow(/Invalid case state transition/);
  });

  it('returns void on valid transition', () => {
    expect(() => validateTransition({ from: 'intake', to: 'triage_ai' })).not.toThrow();
  });
});

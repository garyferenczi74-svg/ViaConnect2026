// Prompt #105 — aggregation snapshot + pack state machine tests.

import { describe, it, expect } from 'vitest';
import {
  ALLOWED_AGG_TRANSITIONS,
  canConsumeInPackDraft,
  canTransitionAggregationSnapshot,
  canWriteKPISnapshots,
} from '@/lib/executiveReporting/aggregation/snapshotLifecycle';
import {
  ALLOWED_PACK_TRANSITIONS,
  canEditPackSections,
  canTransitionPack,
  isPackContentFrozen,
} from '@/lib/executiveReporting/packs/stateMachine';

describe('aggregation snapshot state machine', () => {
  it('draft → computing is allowed; draft → locked is not', () => {
    expect(canTransitionAggregationSnapshot('draft', 'computing')).toBe(true);
    expect(canTransitionAggregationSnapshot('draft', 'locked')).toBe(false);
  });

  it('cfo_approved → locked is the only path to locked', () => {
    for (const from of Object.keys(ALLOWED_AGG_TRANSITIONS) as Array<keyof typeof ALLOWED_AGG_TRANSITIONS>) {
      if (from === 'cfo_approved') continue;
      expect(canTransitionAggregationSnapshot(from, 'locked')).toBe(false);
    }
    expect(canTransitionAggregationSnapshot('cfo_approved', 'locked')).toBe(true);
  });

  it('locked is terminal — no outgoing transitions', () => {
    expect(ALLOWED_AGG_TRANSITIONS.locked).toHaveLength(0);
  });

  it('cfo_review can reject back to draft', () => {
    expect(canTransitionAggregationSnapshot('cfo_review', 'draft')).toBe(true);
  });

  it('only draft + computing allow KPI snapshot writes', () => {
    expect(canWriteKPISnapshots('draft')).toBe(true);
    expect(canWriteKPISnapshots('computing')).toBe(true);
    expect(canWriteKPISnapshots('computed')).toBe(false);
    expect(canWriteKPISnapshots('cfo_approved')).toBe(false);
    expect(canWriteKPISnapshots('locked')).toBe(false);
  });

  it('cfo_approved + locked are the consumable states for pack drafts', () => {
    expect(canConsumeInPackDraft('cfo_approved')).toBe(true);
    expect(canConsumeInPackDraft('locked')).toBe(true);
    expect(canConsumeInPackDraft('draft')).toBe(false);
    expect(canConsumeInPackDraft('computed')).toBe(false);
    expect(canConsumeInPackDraft('failed')).toBe(false);
  });
});

describe('pack state machine', () => {
  it('draft can move forward to mdna_pending or archive', () => {
    expect(canTransitionPack('draft', 'mdna_pending')).toBe(true);
    expect(canTransitionPack('draft', 'archived')).toBe(true);
  });

  it('pack cannot skip CFO approval on the way to CEO', () => {
    expect(canTransitionPack('mdna_drafted', 'pending_ceo_approval')).toBe(false);
    expect(canTransitionPack('cfo_review', 'pending_ceo_approval')).toBe(false);
    expect(canTransitionPack('cfo_approved', 'pending_ceo_approval')).toBe(true);
  });

  it('pending_ceo_approval can issue or kick back to cfo_review', () => {
    expect(canTransitionPack('pending_ceo_approval', 'issued')).toBe(true);
    expect(canTransitionPack('pending_ceo_approval', 'cfo_review')).toBe(true);
  });

  it('issued pack can only move to erratum_issued or archived', () => {
    expect(canTransitionPack('issued', 'erratum_issued')).toBe(true);
    expect(canTransitionPack('issued', 'archived')).toBe(true);
    expect(canTransitionPack('issued', 'draft')).toBe(false);
    expect(canTransitionPack('issued', 'cfo_review')).toBe(false);
  });

  it('archived is terminal', () => {
    expect(ALLOWED_PACK_TRANSITIONS.archived).toHaveLength(0);
  });

  it.each(['draft', 'mdna_pending', 'mdna_drafted', 'cfo_review'] as const)(
    'section edits allowed in %s',
    (s) => {
      expect(canEditPackSections(s)).toBe(true);
    },
  );

  it.each(['issued', 'erratum_issued', 'archived'] as const)(
    'content frozen in %s',
    (s) => {
      expect(isPackContentFrozen(s)).toBe(true);
    },
  );
});

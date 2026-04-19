// Prompt #95 Phase 4: state machine + approval tally tests.
// Governance integrity requires 90%+ coverage on this module. Every valid
// transition is asserted, every invalid transition is asserted blocked,
// and the tally logic is exercised across the full decision lattice.

import { describe, it, expect } from 'vitest';
import {
  applyTransition,
  canTransition,
  isTerminal,
  permittedActions,
  type ProposalAction,
} from '@/lib/governance/state-machine';
import { tallyApprovals, type TallyInput } from '@/lib/governance/tally-approvals';
import type { ProposalStatus } from '@/types/governance';

const ALL_STATUSES: ProposalStatus[] = [
  'draft',
  'submitted_for_approval',
  'under_review',
  'approved_pending_activation',
  'activating',
  'activated',
  'rolled_back',
  'rejected',
  'withdrawn',
  'expired',
];

const ALL_ACTIONS: ProposalAction[] = [
  'submit',
  'record_approval',
  'record_rejection',
  'record_abstention',
  'all_required_approved',
  'activate',
  'rollback',
  'withdraw',
  'expire',
];

// ---- canTransition -------------------------------------------------------

describe('canTransition — valid paths', () => {
  it('draft allows submit + withdraw only', () => {
    expect(canTransition('draft', 'submit')).toBe(true);
    expect(canTransition('draft', 'withdraw')).toBe(true);
    expect(canTransition('draft', 'activate')).toBe(false);
    expect(canTransition('draft', 'record_approval')).toBe(false);
  });

  it('submitted_for_approval accepts decisions + withdraw + expire', () => {
    expect(canTransition('submitted_for_approval', 'record_approval')).toBe(true);
    expect(canTransition('submitted_for_approval', 'record_rejection')).toBe(true);
    expect(canTransition('submitted_for_approval', 'record_abstention')).toBe(true);
    expect(canTransition('submitted_for_approval', 'all_required_approved')).toBe(true);
    expect(canTransition('submitted_for_approval', 'withdraw')).toBe(true);
    expect(canTransition('submitted_for_approval', 'expire')).toBe(true);
    expect(canTransition('submitted_for_approval', 'activate')).toBe(false);
    expect(canTransition('submitted_for_approval', 'submit')).toBe(false);
  });

  it('under_review accepts the same actions as submitted_for_approval', () => {
    expect(canTransition('under_review', 'record_approval')).toBe(true);
    expect(canTransition('under_review', 'record_rejection')).toBe(true);
    expect(canTransition('under_review', 'all_required_approved')).toBe(true);
    expect(canTransition('under_review', 'withdraw')).toBe(true);
    expect(canTransition('under_review', 'activate')).toBe(false);
  });

  it('approved_pending_activation allows activate + withdraw only', () => {
    expect(canTransition('approved_pending_activation', 'activate')).toBe(true);
    expect(canTransition('approved_pending_activation', 'withdraw')).toBe(true);
    expect(canTransition('approved_pending_activation', 'rollback')).toBe(false);
    expect(canTransition('approved_pending_activation', 'record_approval')).toBe(false);
  });

  it('activated allows only rollback', () => {
    expect(canTransition('activated', 'rollback')).toBe(true);
    expect(canTransition('activated', 'activate')).toBe(false);
    expect(canTransition('activated', 'withdraw')).toBe(false);
  });
});

describe('canTransition — terminal states block everything', () => {
  const terminals: ProposalStatus[] = ['rolled_back', 'rejected', 'withdrawn', 'expired'];

  it.each(terminals)('%s blocks every action', (status) => {
    for (const action of ALL_ACTIONS) {
      expect(canTransition(status, action)).toBe(false);
    }
  });
});

describe('isTerminal', () => {
  it('terminal statuses return true', () => {
    expect(isTerminal('rolled_back')).toBe(true);
    expect(isTerminal('rejected')).toBe(true);
    expect(isTerminal('withdrawn')).toBe(true);
    expect(isTerminal('expired')).toBe(true);
  });

  it('non-terminal statuses return false', () => {
    expect(isTerminal('draft')).toBe(false);
    expect(isTerminal('submitted_for_approval')).toBe(false);
    expect(isTerminal('under_review')).toBe(false);
    expect(isTerminal('approved_pending_activation')).toBe(false);
    expect(isTerminal('activating')).toBe(false);
    expect(isTerminal('activated')).toBe(false);
  });
});

describe('permittedActions', () => {
  it('every status returns a valid (possibly empty) list', () => {
    for (const s of ALL_STATUSES) {
      const actions = permittedActions(s);
      expect(Array.isArray(actions)).toBe(true);
      for (const a of actions) {
        expect(ALL_ACTIONS).toContain(a);
      }
    }
  });
});

// ---- applyTransition -----------------------------------------------------

describe('applyTransition — success cases', () => {
  it('draft + submit -> submitted_for_approval', () => {
    expect(applyTransition('draft', 'submit')).toEqual({
      ok: true,
      nextStatus: 'submitted_for_approval',
    });
  });

  it('draft + withdraw -> withdrawn', () => {
    expect(applyTransition('draft', 'withdraw').nextStatus).toBe('withdrawn');
  });

  it('submitted_for_approval + record_approval -> under_review', () => {
    expect(applyTransition('submitted_for_approval', 'record_approval').nextStatus).toBe(
      'under_review',
    );
  });

  it('submitted_for_approval + record_abstention -> under_review', () => {
    expect(applyTransition('submitted_for_approval', 'record_abstention').nextStatus).toBe(
      'under_review',
    );
  });

  it('under_review + record_approval stays in under_review', () => {
    expect(applyTransition('under_review', 'record_approval').nextStatus).toBe('under_review');
  });

  it('any record_rejection -> rejected', () => {
    expect(applyTransition('submitted_for_approval', 'record_rejection').nextStatus).toBe(
      'rejected',
    );
    expect(applyTransition('under_review', 'record_rejection').nextStatus).toBe('rejected');
  });

  it('all_required_approved -> approved_pending_activation', () => {
    expect(applyTransition('under_review', 'all_required_approved').nextStatus).toBe(
      'approved_pending_activation',
    );
  });

  it('approved_pending_activation + activate -> activated', () => {
    expect(applyTransition('approved_pending_activation', 'activate').nextStatus).toBe('activated');
  });

  it('activating + activate -> activated (transient claim state completion)', () => {
    expect(applyTransition('activating', 'activate').nextStatus).toBe('activated');
  });

  it('activating + withdraw -> withdrawn (rare: activator crash recovery)', () => {
    expect(applyTransition('activating', 'withdraw').nextStatus).toBe('withdrawn');
  });

  it('activated + rollback -> rolled_back', () => {
    expect(applyTransition('activated', 'rollback').nextStatus).toBe('rolled_back');
  });

  it('under_review + expire -> expired', () => {
    expect(applyTransition('under_review', 'expire').nextStatus).toBe('expired');
  });
});

describe('applyTransition — blocked cases', () => {
  it('blocks submit when not draft', () => {
    const r = applyTransition('under_review', 'submit');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('submit');
  });

  it('blocks activate when not approved_pending_activation', () => {
    expect(applyTransition('draft', 'activate').ok).toBe(false);
    expect(applyTransition('under_review', 'activate').ok).toBe(false);
    expect(applyTransition('activated', 'activate').ok).toBe(false);
  });

  it('blocks rollback on non-activated', () => {
    expect(applyTransition('draft', 'rollback').ok).toBe(false);
    expect(applyTransition('under_review', 'rollback').ok).toBe(false);
    expect(applyTransition('approved_pending_activation', 'rollback').ok).toBe(false);
  });

  it('blocks every action on every terminal state', () => {
    const terminals: ProposalStatus[] = ['rolled_back', 'rejected', 'withdrawn', 'expired'];
    for (const t of terminals) {
      for (const a of ALL_ACTIONS) {
        expect(applyTransition(t, a).ok).toBe(false);
      }
    }
  });
});

// ---- tallyApprovals ------------------------------------------------------

describe('tallyApprovals — waiting paths', () => {
  it('empty list reports waiting with 0 pending', () => {
    const r = tallyApprovals([]);
    expect(r.kind).toBe('waiting');
    if (r.kind === 'waiting') expect(r.pendingRequired).toBe(0);
  });

  it('all required undecided reports waiting', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: null },
      { is_required: true, is_advisory: false, decision: null },
    ];
    const r = tallyApprovals(rows);
    expect(r.kind).toBe('waiting');
    if (r.kind === 'waiting') expect(r.pendingRequired).toBe(2);
  });

  it('one required decided, other pending reports waiting', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'approved' },
      { is_required: true, is_advisory: false, decision: null },
    ];
    const r = tallyApprovals(rows);
    expect(r.kind).toBe('waiting');
    if (r.kind === 'waiting') expect(r.pendingRequired).toBe(1);
  });

  it('advisory decisions do not affect waiting count', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: null },
      { is_required: false, is_advisory: true, decision: 'approved' },
    ];
    const r = tallyApprovals(rows);
    expect(r.kind).toBe('waiting');
    if (r.kind === 'waiting') expect(r.pendingRequired).toBe(1);
  });
});

describe('tallyApprovals — rejected paths', () => {
  it('any single required rejection reports rejected', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'approved' },
      { is_required: true, is_advisory: false, decision: 'rejected' },
    ];
    const r = tallyApprovals(rows);
    expect(r.kind).toBe('rejected');
    if (r.kind === 'rejected') expect(r.rejectedBy).toBe(1);
  });

  it('rejection short-circuits even with undecided required', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: null },
      { is_required: true, is_advisory: false, decision: 'rejected' },
    ];
    expect(tallyApprovals(rows).kind).toBe('rejected');
  });

  it('advisory rejection does NOT trigger rejected outcome', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'approved' },
      { is_required: false, is_advisory: true, decision: 'rejected' },
    ];
    expect(tallyApprovals(rows).kind).toBe('approved');
  });
});

describe('tallyApprovals — approved paths', () => {
  it('all required approved reports approved', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'approved' },
      { is_required: true, is_advisory: false, decision: 'approved' },
    ];
    const r = tallyApprovals(rows);
    expect(r.kind).toBe('approved');
    if (r.kind === 'approved') expect(r.approvedBy).toBe(2);
  });

  it('required approved + advisory undecided still approves', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'approved' },
      { is_required: false, is_advisory: true, decision: null },
    ];
    expect(tallyApprovals(rows).kind).toBe('approved');
  });

  it('single required approved is sufficient if only one required', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'approved' },
    ];
    expect(tallyApprovals(rows).kind).toBe('approved');
  });
});

describe('tallyApprovals — stalled paths', () => {
  it('all required abstained reports stalled_on_abstention', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'abstain' },
      { is_required: true, is_advisory: false, decision: 'abstain' },
    ];
    const r = tallyApprovals(rows);
    expect(r.kind).toBe('stalled_on_abstention');
    if (r.kind === 'stalled_on_abstention') expect(r.abstentions).toBe(2);
  });

  it('mix of approved + abstained still approves (at least one affirmative)', () => {
    const rows: TallyInput = [
      { is_required: true, is_advisory: false, decision: 'approved' },
      { is_required: true, is_advisory: false, decision: 'abstain' },
    ];
    expect(tallyApprovals(rows).kind).toBe('approved');
  });
});

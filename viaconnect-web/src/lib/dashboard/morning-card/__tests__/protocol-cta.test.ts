import { describe, it, expect } from 'vitest';
import {
  MORNING_CTA_EMPTY,
  MORNING_CTA_ERROR,
  MORNING_CTA_LOADING,
} from '../copy';
import {
  PROTOCOL_CTA_LOADING_BOUND_MS,
  firstIncompleteProtocolAction,
  protocolItemsInCtaOrder,
  type MorningProtocolBuckets,
  type MorningProtocolItem,
} from '../protocol-cta';

function item(
  partial: Pick<MorningProtocolItem, 'slotId' | 'name' | 'timeOfDay' | 'taken'> & {
    dose?: string | null;
  },
): MorningProtocolItem {
  return {
    userSupplementId: `u-${partial.slotId}`,
    dose: partial.dose ?? '1 capsule',
    ...partial,
  };
}

const emptyView: MorningProtocolBuckets = {
  morning: [],
  afternoon: [],
  evening: [],
};

describe('morning-card protocol CTA', () => {
  it('picks the first incomplete item in the current bucket before later buckets', () => {
    const view: MorningProtocolBuckets = {
      morning: [
        item({ slotId: 'm1', name: 'MTHFR+', timeOfDay: 'morning', taken: true }),
        item({ slotId: 'm2', name: 'COMT+', timeOfDay: 'morning', taken: false }),
      ],
      afternoon: [
        item({ slotId: 'a1', name: 'NAD+', timeOfDay: 'afternoon', taken: false }),
      ],
      evening: [
        item({ slotId: 'e1', name: 'FOCUS+', timeOfDay: 'evening', taken: false }),
      ],
    };
    const cta = firstIncompleteProtocolAction(view, { nowBucket: 'morning' });
    expect(cta.kind).toBe('action');
    expect(cta.label).toBe('Take COMT+');
    expect(cta.item?.slotId).toBe('m2');
    expect(cta.item?.dose).toBe('1 capsule');
    expect(cta.item?.timeOfDay).toBe('morning');
    expect(cta.href).toBe('/supplements');
  });

  it('shows product and dose from a real due row, including window', () => {
    const view: MorningProtocolBuckets = {
      morning: [],
      afternoon: [],
      evening: [
        item({
          slotId: 'e1',
          name: 'Creatine HCl',
          dose: '500mg',
          timeOfDay: 'evening',
          taken: false,
        }),
      ],
    };
    const cta = firstIncompleteProtocolAction(view, { nowBucket: 'evening' });
    expect(cta.kind).toBe('action');
    expect(cta.label).toBe('Take Creatine HCl');
    expect(cta.item?.name).toBe('Creatine HCl');
    expect(cta.item?.dose).toBe('500mg');
    expect(cta.item?.timeOfDay).toBe('evening');
    expect(cta.label).not.toMatch(/Semaglutide/i);
  });

  it('walks remaining buckets when the current bucket is complete', () => {
    const view: MorningProtocolBuckets = {
      morning: [
        item({ slotId: 'm1', name: 'MTHFR+', timeOfDay: 'morning', taken: true }),
      ],
      afternoon: [
        item({ slotId: 'a1', name: 'NAD+', timeOfDay: 'afternoon', taken: false }),
      ],
      evening: [],
    };
    const cta = firstIncompleteProtocolAction(view, { nowBucket: 'morning' });
    expect(cta.kind).toBe('action');
    expect(cta.label).toBe('Take NAD+');
    expect(cta.item?.timeOfDay).toBe('afternoon');
  });

  it('orders current bucket first then remaining schedule buckets', () => {
    const view: MorningProtocolBuckets = {
      morning: [item({ slotId: 'm1', name: 'M', timeOfDay: 'morning', taken: false })],
      afternoon: [item({ slotId: 'a1', name: 'A', timeOfDay: 'afternoon', taken: false })],
      evening: [item({ slotId: 'e1', name: 'E', timeOfDay: 'evening', taken: false })],
    };
    expect(
      protocolItemsInCtaOrder(view, 'afternoon').map((i) => i.slotId),
    ).toEqual(['a1', 'm1', 'e1']);
  });

  it('folds a fully taken protocol into empty, with no Helix fallback', () => {
    const view: MorningProtocolBuckets = {
      morning: [item({ slotId: 'm1', name: 'MTHFR+', timeOfDay: 'morning', taken: true })],
      afternoon: [item({ slotId: 'a1', name: 'NAD+', timeOfDay: 'afternoon', taken: true })],
      evening: [],
    };
    const cta = firstIncompleteProtocolAction(view, { nowBucket: 'morning' });
    expect(cta.kind).toBe('empty');
    expect(cta.label).toBe(MORNING_CTA_EMPTY);
    expect(cta.label).toBe('No protocol item due today.');
    expect(cta.item).toBeNull();
    expect(cta.href).toBe('/supplements');
    expect(cta.label).not.toMatch(/Helix/i);
  });

  it('returns empty copy when the protocol has no due item', () => {
    const cta = firstIncompleteProtocolAction(emptyView, { nowBucket: 'morning' });
    expect(cta.kind).toBe('empty');
    expect(cta.label).toBe('No protocol item due today.');
    expect(cta.href).toBe('/supplements');
    expect(cta.label).not.toMatch(/Helix/i);
    expect(cta.label).not.toMatch(/Complete your assessment/i);
  });

  it('does not invent a Helix action while loading or in error', () => {
    expect(firstIncompleteProtocolAction(emptyView, { status: 'loading' }).kind).toBe(
      'loading',
    );
    expect(
      firstIncompleteProtocolAction(null, { status: 'unavailable' }).kind,
    ).toBe('error');
    expect(firstIncompleteProtocolAction(null, { status: 'unavailable' }).label).toBe(
      MORNING_CTA_ERROR,
    );
    expect(firstIncompleteProtocolAction(emptyView, { status: 'loading' }).label).not.toMatch(
      /Helix/i,
    );
  });

  it('after the loading bound, kind is never still loading with the loading label', () => {
    const atBound = firstIncompleteProtocolAction(emptyView, {
      status: 'loading',
      loadingElapsedMs: PROTOCOL_CTA_LOADING_BOUND_MS,
    });
    const pastBound = firstIncompleteProtocolAction(emptyView, {
      status: 'loading',
      loadingElapsedMs: PROTOCOL_CTA_LOADING_BOUND_MS + 1,
    });
    const beforeBound = firstIncompleteProtocolAction(emptyView, {
      status: 'loading',
      loadingElapsedMs: PROTOCOL_CTA_LOADING_BOUND_MS - 1,
    });

    expect(PROTOCOL_CTA_LOADING_BOUND_MS).toBe(1500);
    expect(atBound.kind).not.toBe('loading');
    expect(atBound.kind).toBe('error');
    expect(atBound.label).not.toBe(MORNING_CTA_LOADING);
    expect(atBound.label).toBe(MORNING_CTA_ERROR);
    expect(atBound.label).not.toMatch(/Loading today protocol/);

    expect(pastBound.kind).toBe('error');
    expect(pastBound.label).not.toBe(MORNING_CTA_LOADING);

    expect(beforeBound.kind).toBe('loading');
    expect(beforeBound.label).toBe(MORNING_CTA_LOADING);
  });
});

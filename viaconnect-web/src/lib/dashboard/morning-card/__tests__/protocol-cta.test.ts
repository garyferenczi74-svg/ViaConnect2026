import { describe, it, expect } from 'vitest';
import {
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
    expect(cta.href).toBe('/supplements');
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

  it('returns complete when every item is taken, with no Helix fallback', () => {
    const view: MorningProtocolBuckets = {
      morning: [item({ slotId: 'm1', name: 'MTHFR+', timeOfDay: 'morning', taken: true })],
      afternoon: [item({ slotId: 'a1', name: 'NAD+', timeOfDay: 'afternoon', taken: true })],
      evening: [],
    };
    const cta = firstIncompleteProtocolAction(view, { nowBucket: 'morning' });
    expect(cta.kind).toBe('complete');
    expect(cta.label).toBe("Today's protocol is complete");
    expect(cta.item).toBeNull();
    expect(cta.label).not.toMatch(/Helix/i);
  });

  it('returns empty assessment CTA when the protocol has no items', () => {
    const cta = firstIncompleteProtocolAction(emptyView, { nowBucket: 'morning' });
    expect(cta.kind).toBe('empty');
    expect(cta.label).toBe('Complete your assessment');
    expect(cta.href).toBe('/onboarding/i-caq-intro');
    expect(cta.label).not.toMatch(/Helix/i);
  });

  it('does not invent a Helix action while loading or unavailable', () => {
    expect(firstIncompleteProtocolAction(emptyView, { status: 'loading' }).kind).toBe(
      'loading',
    );
    expect(
      firstIncompleteProtocolAction(null, { status: 'unavailable' }).kind,
    ).toBe('unavailable');
    expect(firstIncompleteProtocolAction(emptyView, { status: 'loading' }).label).not.toMatch(
      /Helix/i,
    );
  });
});

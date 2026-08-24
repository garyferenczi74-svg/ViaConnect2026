// One protocol action for the morning card: first incomplete
// TodaysProtocol item. No rewards-gamification fallback.

import { currentLocalScheduleBucket } from '@/lib/supplements/dailyScheduleShared';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';
import {
  MORNING_CTA_COMPLETE,
  MORNING_CTA_EMPTY,
  MORNING_CTA_LOADING,
  MORNING_CTA_UNAVAILABLE,
  morningCtaTakeLabel,
} from './copy';

export const PROTOCOL_BUCKETS: readonly TimeOfDay[] = [
  'morning',
  'afternoon',
  'evening',
] as const;

export interface MorningProtocolItem {
  slotId: string;
  userSupplementId: string;
  name: string;
  dose: string | null;
  timeOfDay: TimeOfDay;
  taken: boolean;
}

export type MorningProtocolCtaKind =
  | 'action'
  | 'complete'
  | 'empty'
  | 'loading'
  | 'unavailable';

export interface MorningProtocolCta {
  kind: MorningProtocolCtaKind;
  label: string;
  href: string | null;
  item: MorningProtocolItem | null;
}

export interface MorningProtocolBuckets {
  morning: readonly MorningProtocolItem[];
  afternoon: readonly MorningProtocolItem[];
  evening: readonly MorningProtocolItem[];
}

const CAQ_HREF = '/onboarding/i-caq-intro';
const PROTOCOL_HREF = '/supplements';

export function protocolItemsInCtaOrder(
  view: MorningProtocolBuckets,
  nowBucket: TimeOfDay = currentLocalScheduleBucket(),
): MorningProtocolItem[] {
  const rest = PROTOCOL_BUCKETS.filter((b) => b !== nowBucket);
  const order: TimeOfDay[] = [nowBucket, ...rest];
  const out: MorningProtocolItem[] = [];
  for (const bucket of order) {
    out.push(...(view[bucket] ?? []));
  }
  return out;
}

export function firstIncompleteProtocolAction(
  view: MorningProtocolBuckets | null | undefined,
  options?: {
    status?: 'loading' | 'ready' | 'unavailable';
    nowBucket?: TimeOfDay;
  },
): MorningProtocolCta {
  if (options?.status === 'loading') {
    return {
      kind: 'loading',
      label: MORNING_CTA_LOADING,
      href: null,
      item: null,
    };
  }
  if (options?.status === 'unavailable' || !view) {
    return {
      kind: 'unavailable',
      label: MORNING_CTA_UNAVAILABLE,
      href: null,
      item: null,
    };
  }

  const items = protocolItemsInCtaOrder(view, options?.nowBucket);
  if (items.length === 0) {
    return {
      kind: 'empty',
      label: MORNING_CTA_EMPTY,
      href: CAQ_HREF,
      item: null,
    };
  }

  const next = items.find((item) => item.taken === false) ?? null;
  if (!next) {
    return {
      kind: 'complete',
      label: MORNING_CTA_COMPLETE,
      href: PROTOCOL_HREF,
      item: null,
    };
  }

  return {
    kind: 'action',
    label: morningCtaTakeLabel(next.name),
    href: PROTOCOL_HREF,
    item: next,
  };
}

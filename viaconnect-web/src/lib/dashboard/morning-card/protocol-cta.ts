// One protocol action for the morning card: first incomplete
// TodaysProtocol item. No rewards-gamification fallback.
// Brief 48: four hero states only (item / empty / loading / error).
// Loading is bounded; complete folds into empty. No new bucket walk.

import { currentLocalScheduleBucket } from '@/lib/supplements/dailyScheduleShared';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';
import {
  MORNING_CTA_EMPTY,
  MORNING_CTA_ERROR,
  MORNING_CTA_LOADING,
  morningCtaTakeLabel,
} from './copy';

export const PROTOCOL_BUCKETS: readonly TimeOfDay[] = [
  'morning',
  'afternoon',
  'evening',
] as const;

/** Hero loading may last at most this long, then Item, Empty, or Error. */
export const PROTOCOL_CTA_LOADING_BOUND_MS = 1500;

export interface MorningProtocolItem {
  slotId: string;
  userSupplementId: string;
  name: string;
  dose: string | null;
  timeOfDay: TimeOfDay;
  taken: boolean;
}

export type MorningProtocolCtaKind = 'action' | 'empty' | 'loading' | 'error';

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

function errorCta(): MorningProtocolCta {
  return {
    kind: 'error',
    label: MORNING_CTA_ERROR,
    href: null,
    item: null,
  };
}

function emptyCta(): MorningProtocolCta {
  return {
    kind: 'empty',
    label: MORNING_CTA_EMPTY,
    href: PROTOCOL_HREF,
    item: null,
  };
}

export function firstIncompleteProtocolAction(
  view: MorningProtocolBuckets | null | undefined,
  options?: {
    status?: 'loading' | 'ready' | 'unavailable';
    nowBucket?: TimeOfDay;
    loadingElapsedMs?: number;
  },
): MorningProtocolCta {
  if (options?.status === 'loading') {
    const elapsed = options.loadingElapsedMs ?? 0;
    if (elapsed >= PROTOCOL_CTA_LOADING_BOUND_MS) {
      return errorCta();
    }
    return {
      kind: 'loading',
      label: MORNING_CTA_LOADING,
      href: null,
      item: null,
    };
  }
  if (options?.status === 'unavailable' || !view) {
    return errorCta();
  }

  const items = protocolItemsInCtaOrder(view, options?.nowBucket);
  const next = items.find((item) => item.taken === false) ?? null;
  if (!next) {
    return emptyCta();
  }

  return {
    kind: 'action',
    label: morningCtaTakeLabel(next.name),
    href: PROTOCOL_HREF,
    item: next,
  };
}

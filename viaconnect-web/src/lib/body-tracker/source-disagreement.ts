// Honest source disagreement DISPLAY for Bio Optimization Score detail.
// Engine rules stay in ArnoldReconciler. This layer only explains them.
//
// DISPLAY: both rows stay visible; one is_active. DISAGREE when two of the
// four vendors differ on the same marketing dim. Equal-trust active value
// uses "averaged because equal trust." Manual wins with no DISAGREE chrome.

export interface SourceValue {
  source: string;
  value: number | null;
  trust: number;
  label?: string;
  shortLabel?: string;
  manual?: boolean;
  is_active?: boolean;
  metricKey?: string;
}

export type DisagreementKind =
  | 'single'
  | 'agree'
  | 'winner'
  | 'equal_trust_average'
  | 'manual'
  | 'pending';

export interface DisagreementExplanation {
  kind: DisagreementKind;
  headline: string;
  detail: string;
  left: SourceValue | null;
  right: SourceValue | null;
  sources: SourceValue[];
  winnerSource: string | null;
  winnerLabel: string | null;
  resolvedValue: number | null;
  resolvedDisplay: string;
  averagedBecauseEqualTrust: boolean;
  showWinnerBadge: boolean;
  showDisagreeChrome: boolean;
  manual: boolean;
  activeIcon: string | null;
}

export const EQUAL_TRUST_COPY = 'averaged because equal trust.';

const VALUE_EPS = 1e-6;

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function nameOf(s: SourceValue): string {
  return s.shortLabel ?? s.label ?? s.source;
}

function displayValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'UNKNOWN';
  return fmt(value);
}

function valuesDiffer(a: number, b: number): boolean {
  return Math.abs(a - b) > VALUE_EPS;
}

function withActive(sources: SourceValue[], active: Set<string>): SourceValue[] {
  return sources.map((s) => ({ ...s, is_active: active.has(s.source) }));
}

function pending(sources: SourceValue[], manual = false): DisagreementExplanation {
  return {
    kind: 'pending',
    headline: '',
    detail: 'One or more sources pending or unavailable.',
    left: sources[0] ?? null,
    right: sources[1] ?? null,
    sources,
    winnerSource: null,
    winnerLabel: null,
    resolvedValue: null,
        resolvedDisplay: 'UNKNOWN',
    averagedBecauseEqualTrust: false,
    showWinnerBadge: false,
    showDisagreeChrome: false,
    manual,
    activeIcon: null,
  };
}

function pack(
  partial: Omit<DisagreementExplanation, 'left' | 'right' | 'activeIcon'> & {
    sources: SourceValue[];
  },
): DisagreementExplanation {
  const active = partial.sources.find((s) => s.is_active);
  return {
    ...partial,
    left: partial.sources[0] ?? null,
    right: partial.sources[1] ?? null,
    activeIcon: partial.averagedBecauseEqualTrust ? null : active?.source ?? partial.winnerSource,
  };
}

export function winnerCopy(label: string): string {
  return `Devices disagree. Using ${label}.`;
}

export function reconcileDimensionSources(sources: SourceValue[]): DisagreementExplanation {
  const usable = sources.filter((s) => s.value !== null && Number.isFinite(s.value));
  const manuals = usable.filter((s) => s.manual === true || s.source === 'manual');

  if (usable.length === 0) {
    return pending(sources, sources.some((s) => s.manual === true || s.source === 'manual'));
  }

  if (manuals.length > 0) {
    const manual = manuals[0];
    const rest = usable.filter((s) => s.source !== manual.source);
    const wearableDiffers = rest.some((w) => valuesDiffer(w.value as number, manual.value as number));
    const shown = wearableDiffers ? usable : [manual];
    return pack({
      kind: 'manual',
      headline: '',
      detail: '',
      sources: withActive(shown, new Set([manual.source])),
      winnerSource: manual.source,
      winnerLabel: nameOf(manual),
      resolvedValue: manual.value,
      resolvedDisplay: fmt(manual.value as number),
      averagedBecauseEqualTrust: false,
      showWinnerBadge: false,
      showDisagreeChrome: false,
      manual: true,
    });
  }

  const metricKeys = new Set(usable.map((s) => s.metricKey).filter((k): k is string => Boolean(k)));
  if (metricKeys.size > 1) {
    const winner = [...usable].sort((a, b) => b.trust - a.trust)[0];
    return pack({
      kind: 'agree',
      headline: '',
      detail: '',
      sources: withActive(usable, new Set([winner.source])),
      winnerSource: winner.source,
      winnerLabel: nameOf(winner),
      resolvedValue: winner.value,
      resolvedDisplay: fmt(winner.value as number),
      averagedBecauseEqualTrust: false,
      showWinnerBadge: false,
      showDisagreeChrome: false,
      manual: false,
    });
  }

  if (usable.length === 1) {
    const only = usable[0];
    return pack({
      kind: 'single',
      headline: '',
      detail: only.source === 'whoop' ? 'Whoop native only.' : '',
      sources: withActive(usable, new Set([only.source])),
      winnerSource: only.source,
      winnerLabel: nameOf(only),
      resolvedValue: only.value,
      resolvedDisplay: displayValue(only.value),
      averagedBecauseEqualTrust: false,
      showWinnerBadge: false,
      showDisagreeChrome: false,
      manual: false,
    });
  }

  const maxTrust = Math.max(...usable.map((s) => s.trust));
  const top = usable.filter((s) => s.trust === maxTrust);
  const topVals = top.map((s) => s.value as number);
  const topDiffer = topVals.some((v) => valuesDiffer(v, topVals[0]));

  if (top.length === 1 || !topDiffer) {
    const winner = top[0];
    const differ = usable.some((s) => valuesDiffer(s.value as number, winner.value as number));
    const tagged = withActive(usable, new Set([winner.source]));
    if (!differ) {
      return pack({
        kind: 'agree',
        headline: '',
        detail: '',
        sources: tagged,
        winnerSource: winner.source,
        winnerLabel: nameOf(winner),
        resolvedValue: winner.value,
        resolvedDisplay: fmt(winner.value as number),
        averagedBecauseEqualTrust: false,
        showWinnerBadge: false,
        showDisagreeChrome: false,
        manual: false,
      });
    }
    return pack({
      kind: 'winner',
      headline: 'DISAGREE',
      detail: winnerCopy(nameOf(winner)),
      sources: tagged,
      winnerSource: winner.source,
      winnerLabel: nameOf(winner),
      resolvedValue: winner.value,
      resolvedDisplay: fmt(winner.value as number),
      averagedBecauseEqualTrust: false,
      showWinnerBadge: true,
      showDisagreeChrome: true,
      manual: false,
    });
  }

  const averaged = topVals.reduce((a, b) => a + b, 0) / topVals.length;
  return pack({
    kind: 'equal_trust_average',
    headline: 'DISAGREE',
    detail: EQUAL_TRUST_COPY,
    sources: withActive(usable, new Set()),
    winnerSource: null,
    winnerLabel: null,
    resolvedValue: averaged,
    resolvedDisplay: fmt(averaged),
    averagedBecauseEqualTrust: true,
    showWinnerBadge: false,
    showDisagreeChrome: true,
    manual: false,
  });
}

/** Two-source helper used by existing tests. */
export function explainDisagreement(left: SourceValue, right: SourceValue): DisagreementExplanation {
  return reconcileDimensionSources([left, right]);
}

function singleSource(s: SourceValue): DisagreementExplanation {
  return reconcileDimensionSources([s]);
}

export interface DimensionSourceRow {
  dimension: string;
  source: string | null;
  value: number | null;
  displayValue: string;
  status: 'sourced' | 'pending';
  showRing: boolean;
  manual: boolean;
  disagreement: DisagreementExplanation | null;
  sources: SourceValue[];
}

export function buildDimensionSourceRows(
  dimensions: string[],
  sourced: Array<{
    dimension: string;
    sources: SourceValue[];
    manual?: boolean;
  }>,
): DimensionSourceRow[] {
  return dimensions.map((dimension) => {
    const found = sourced.find((s) => s.dimension === dimension);
    const values = found?.sources ?? [];
    const disagreement = reconcileDimensionSources(values);
    const manual = Boolean(found?.manual || disagreement.manual);

    if (disagreement.kind === 'pending') {
      return {
        dimension,
        source: null,
        value: null,
        displayValue: 'UNKNOWN',
        status: 'pending',
        showRing: false,
        manual,
        disagreement,
        sources: disagreement.sources,
      };
    }

    const value = disagreement.resolvedValue;
    const showRing = value !== null && Number.isFinite(value);

    return {
      dimension,
      source: disagreement.winnerSource ?? (disagreement.averagedBecauseEqualTrust ? 'average' : null),
      value,
      displayValue: disagreement.resolvedDisplay,
      status: 'sourced',
      showRing,
      manual,
      disagreement,
      sources: disagreement.sources,
    };
  });
}

export function formatUnknownOrPending(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'UNKNOWN';
  return fmt(value);
}

export { singleSource };

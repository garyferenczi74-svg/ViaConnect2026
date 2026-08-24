// Honest source disagreement copy for Bio Optimization Score detail.
// Picasso: one source (no winner badge), DISAGREE both + winner line,
// equal trust both + "Averaged because equal trust.", Pending never a number.

export interface SourceValue {
  source: string;
  value: number | null;
  trust: number;
  label?: string;
  manual?: boolean;
}

export type DisagreementKind = 'single' | 'winner' | 'equal_trust_average' | 'pending';

export interface DisagreementExplanation {
  kind: DisagreementKind;
  headline: string;
  detail: string;
  left: SourceValue | null;
  right: SourceValue | null;
  winnerSource: string | null;
  winnerLabel: string | null;
  resolvedValue: number | null;
  resolvedDisplay: string;
  averagedBecauseEqualTrust: boolean;
  showWinnerBadge: boolean;
  manual: boolean;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function nameOf(s: SourceValue): string {
  return s.label ?? s.source;
}

function displayValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'UNKNOWN';
  return fmt(value);
}

export function explainDisagreement(left: SourceValue, right: SourceValue): DisagreementExplanation {
  const leftOk = left.value !== null && Number.isFinite(left.value);
  const rightOk = right.value !== null && Number.isFinite(right.value);

  if (!leftOk && !rightOk) {
    return {
      kind: 'pending',
      headline: '',
      detail: 'One or more sources pending or unavailable.',
      left,
      right,
      winnerSource: null,
      winnerLabel: null,
      resolvedValue: null,
      resolvedDisplay: 'Pending',
      averagedBecauseEqualTrust: false,
      showWinnerBadge: false,
      manual: Boolean(left.manual || right.manual),
    };
  }

  if (leftOk && !rightOk) {
    return singleSource(left);
  }
  if (rightOk && !leftOk) {
    return singleSource(right);
  }

  const lv = left.value as number;
  const rv = right.value as number;

  if (left.trust > right.trust) {
    return {
      kind: 'winner',
      headline: 'DISAGREE',
      detail: `Devices disagree. Using ${nameOf(left)}.`,
      left,
      right,
      winnerSource: left.source,
      winnerLabel: nameOf(left),
      resolvedValue: lv,
      resolvedDisplay: fmt(lv),
      averagedBecauseEqualTrust: false,
      showWinnerBadge: true,
      manual: Boolean(left.manual || right.manual),
    };
  }
  if (right.trust > left.trust) {
    return {
      kind: 'winner',
      headline: 'DISAGREE',
      detail: `Devices disagree. Using ${nameOf(right)}.`,
      left,
      right,
      winnerSource: right.source,
      winnerLabel: nameOf(right),
      resolvedValue: rv,
      resolvedDisplay: fmt(rv),
      averagedBecauseEqualTrust: false,
      showWinnerBadge: true,
      manual: Boolean(left.manual || right.manual),
    };
  }

  const averaged = (lv + rv) / 2;
  return {
    kind: 'equal_trust_average',
    headline: 'DISAGREE',
    detail: 'Averaged because equal trust.',
    left,
    right,
    winnerSource: null,
    winnerLabel: null,
    resolvedValue: averaged,
    resolvedDisplay: fmt(averaged),
    averagedBecauseEqualTrust: true,
    showWinnerBadge: false,
    manual: Boolean(left.manual || right.manual),
  };
}

function singleSource(s: SourceValue): DisagreementExplanation {
  return {
    kind: 'single',
    headline: '',
    detail: s.source.startsWith('wearable:whoop') || s.source === 'whoop' ? 'Whoop native only.' : '',
    left: s,
    right: null,
    winnerSource: s.source,
    winnerLabel: nameOf(s),
    resolvedValue: s.value,
    resolvedDisplay: displayValue(s.value),
    averagedBecauseEqualTrust: false,
    showWinnerBadge: false,
    manual: Boolean(s.manual),
  };
}

export interface DimensionSourceRow {
  dimension: string;
  source: string | null;
  value: number | null;
  displayValue: string;
  status: 'sourced' | 'pending';
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
    const usable = values.filter((v) => v.value !== null && Number.isFinite(v.value));
    const manual = Boolean(found?.manual || values.some((v) => v.manual));

    if (usable.length === 0) {
      return {
        dimension,
        source: null,
        value: null,
        displayValue: 'Pending',
        status: 'pending',
        manual,
        disagreement: null,
        sources: values,
      };
    }
    if (usable.length === 1) {
      return {
        dimension,
        source: usable[0].source,
        value: usable[0].value,
        displayValue: displayValue(usable[0].value),
        status: 'sourced',
        manual,
        disagreement: singleSource(usable[0]),
        sources: values,
      };
    }
    const disagreement = explainDisagreement(usable[0], usable[1]);
    return {
      dimension,
      source: disagreement.winnerSource ?? `${usable[0].source}+${usable[1].source}`,
      value: disagreement.resolvedValue,
      displayValue: disagreement.resolvedDisplay,
      status: 'sourced',
      manual,
      disagreement,
      sources: values,
    };
  });
}

export function formatUnknownOrPending(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Pending';
  return fmt(value);
}

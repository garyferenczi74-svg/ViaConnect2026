// Honest Arnold/Jeffery morph stamp for the live WebGL canvas.
//
// The smoke cannot infer silhouette from pixels alone (INCONCLUSIVE → lean FAIL
// when these attrs are missing). Stamp only real numbers: BF from the scan
// snapshot, waist from the param vector after estimate/measured/overlay girths
// were mapped. Never invent a waist or BF.

import { anyCircumferencePresent } from '@/lib/body-tracker/composition/scanSpineContract';
import {
  historySnapshotCanEstimateGirths,
  resolveAvatarGirthSource,
} from '@/lib/body-tracker/composition/resolveAvatarCircumferences';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { templateForSex, type Sex } from '@/lib/formavision/geometry/types';

export type AvatarGirthSource = ReturnType<typeof resolveAvatarGirthSource>;
export { resolveAvatarGirthSource };

export interface AvatarMorphStamp {
  morph: 'applied' | 'template';
  source: AvatarGirthSource;
  bf: string;
  waistM: string;
  templateWaistM: string;
}

function formatBfPct(scan: CompositionSnapshot | null): string {
  if (!scan) return '';
  const mid = scan.totalBodyFatPct;
  if (typeof mid === 'number' && Number.isFinite(mid) && mid > 0) {
    return (Math.round(mid * 10) / 10).toFixed(1);
  }
  const min = scan.estimatedBodyFatMin;
  const max = scan.estimatedBodyFatMax;
  if (
    typeof min === 'number' &&
    typeof max === 'number' &&
    Number.isFinite(min) &&
    Number.isFinite(max)
  ) {
    return (Math.round(((min + max) / 2) * 10) / 10).toFixed(1);
  }
  return '';
}

export function buildAvatarMorphStamp(args: {
  scan: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  sex: Sex;
  unit: MeasurementUnit;
  source?: AvatarGirthSource;
}): AvatarMorphStamp {
  const source =
    args.source ??
    (anyCircumferencePresent(args.circumferences)
      ? historySnapshotCanEstimateGirths(args.scan)
        ? 'estimate'
        : 'measured'
      : 'none');
  const vector = scanToParamVector({
    snapshot: args.scan,
    circumferences: args.circumferences,
    sex: args.sex,
    unit: args.unit,
  });
  const waist = vector.rings.find((r) => r.id === 'waist')?.circumferenceM;
  const templateWaist = templateForSex(args.sex).rings.find((r) => r.id === 'waist')?.circumferenceM;
  const hasAppliedWaist =
    typeof waist === 'number' &&
    Number.isFinite(waist) &&
    templateWaist !== undefined &&
    Math.abs(waist - templateWaist) > 0.005;
  return {
    morph: hasAppliedWaist ? 'applied' : 'template',
    source,
    bf: formatBfPct(args.scan),
    waistM:
      typeof waist === 'number' && Number.isFinite(waist) ? waist.toFixed(3) : '',
    templateWaistM:
      typeof templateWaist === 'number' && Number.isFinite(templateWaist)
        ? templateWaist.toFixed(3)
        : '',
  };
}

export function applyAvatarMorphStamp(
  el: Element | null | undefined,
  stamp: AvatarMorphStamp,
): void {
  if (!el) return;
  el.setAttribute('data-morph', stamp.morph);
  el.setAttribute('data-morph-source', stamp.source);
  el.setAttribute('data-morph-bf', stamp.bf);
  el.setAttribute('data-morph-waist-m', stamp.waistM);
  el.setAttribute('data-morph-template-waist-m', stamp.templateWaistM);
}

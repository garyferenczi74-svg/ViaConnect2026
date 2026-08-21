/**
 * Prompt 226 Module A: pure concentration → syringe unit arithmetic.
 * Platform never originates a dose. All numeric inputs must come from the user.
 * No rounding in intermediate steps; round for display only.
 */

export type MassUnit = 'mg' | 'mcg' | 'IU';
export type SyringeStandard = 'U-100' | 'U-40';
export type BarrelSize = 100 | 50 | 30;

export interface ConverterInputs {
  vialAmount: number;
  vialUnit: MassUnit;
  diluentMl: number;
  doseAmount: number;
  doseUnit: MassUnit;
  syringeStandard: SyringeStandard;
  barrelSize: BarrelSize;
  /** Required when either unit is IU. Must be verified compound factor. */
  iuMgFactor?: number | null;
  iuMgFactorVerified?: boolean;
}

export type ConverterErrorCode =
  | 'missing_input'
  | 'non_positive'
  | 'unit_mismatch_iu'
  | 'iu_factor_unverified'
  | 'dose_exceeds_vial'
  | 'barrel_overflow'
  | 'invalid_number';

export interface ConverterWarning {
  code: 'precision_low' | 'unit_scale_suspect' | 'standard_changed';
  message: string;
}

export interface ConverterSuccess {
  ok: true;
  concentrationPerMl: number;
  volumeMl: number;
  syringeUnits: number;
  syringeUnitsDisplay: number;
  volumeMlDisplay: number;
  concentrationDisplay: number;
  warnings: ConverterWarning[];
  needsUnitConfirmation: boolean;
  alternateInterpretation?: {
    assumedDoseUnit: MassUnit;
    syringeUnits: number;
  };
  resultStandardLabel: string;
}

export interface ConverterFailure {
  ok: false;
  code: ConverterErrorCode;
  message: string;
}

export type ConverterResult = ConverterSuccess | ConverterFailure;

const UNITS_PER_ML: Record<SyringeStandard, number> = {
  'U-100': 100,
  'U-40': 40,
};

function isFinitePositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Convert amount to mg using verified IU factor when needed. */
export function toMg(
  amount: number,
  unit: MassUnit,
  iuMgFactor?: number | null,
  iuVerified?: boolean,
): { mg: number } | { error: ConverterFailure } {
  if (unit === 'mg') return { mg: amount };
  if (unit === 'mcg') return { mg: amount / 1000 };
  if (!iuVerified || iuMgFactor == null || !(iuMgFactor > 0)) {
    return {
      error: {
        ok: false,
        code: 'iu_factor_unverified',
        message:
          'IU is disabled for this compound until a verified IU-to-mg factor exists in Collection 14. Do not apply a generic factor.',
      },
    };
  }
  return { mg: amount * iuMgFactor };
}

function roundDisplay(n: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Pure converter. Returns no result when any required input is absent or invalid.
 */
export function computeSyringeUnits(input: ConverterInputs): ConverterResult {
  const {
    vialAmount,
    vialUnit,
    diluentMl,
    doseAmount,
    doseUnit,
    syringeStandard,
    barrelSize,
    iuMgFactor,
    iuMgFactorVerified,
  } = input;

  if (
    vialAmount == null ||
    doseAmount == null ||
    diluentMl == null ||
    !vialUnit ||
    !doseUnit ||
    !syringeStandard ||
    !barrelSize
  ) {
    return {
      ok: false,
      code: 'missing_input',
      message: 'All inputs are required. No partial result is shown.',
    };
  }

  if (
    !isFinitePositive(vialAmount) ||
    !isFinitePositive(diluentMl) ||
    !isFinitePositive(doseAmount)
  ) {
    return {
      ok: false,
      code: 'non_positive',
      message: 'Amounts must be finite numbers greater than zero.',
    };
  }

  if (
    (vialUnit === 'IU' || doseUnit === 'IU') &&
    (vialUnit !== doseUnit ||
      !iuMgFactorVerified ||
      iuMgFactor == null ||
      !(iuMgFactor > 0))
  ) {
    if (vialUnit === 'IU' || doseUnit === 'IU') {
      if (vialUnit !== doseUnit) {
        return {
          ok: false,
          code: 'unit_mismatch_iu',
          message: 'Vial and dose units must both be IU when using IU.',
        };
      }
      return {
        ok: false,
        code: 'iu_factor_unverified',
        message:
          'IU is disabled for this compound until a verified IU-to-mg factor exists in Collection 14.',
      };
    }
  }

  const vialMg = toMg(vialAmount, vialUnit, iuMgFactor, iuMgFactorVerified);
  if ('error' in vialMg) return vialMg.error;
  const doseMg = toMg(doseAmount, doseUnit, iuMgFactor, iuMgFactorVerified);
  if ('error' in doseMg) return doseMg.error;

  if (doseMg.mg > vialMg.mg + 1e-12) {
    return {
      ok: false,
      code: 'dose_exceeds_vial',
      message:
        'Entered dose exceeds total vial contents. Check for an mg/mcg unit mismatch.',
    };
  }

  const concentrationPerMl = vialMg.mg / diluentMl;
  const volumeMl = doseMg.mg / concentrationPerMl;
  const unitsPerMl = UNITS_PER_ML[syringeStandard];
  const syringeUnits = volumeMl * unitsPerMl;

  if (syringeUnits > barrelSize + 1e-9) {
    return {
      ok: false,
      code: 'barrel_overflow',
      message:
        'Computed draw exceeds the selected barrel capacity. This usually means a reconstitution volume or unit mismatch.',
    };
  }

  const warnings: ConverterWarning[] = [];
  if (barrelSize === 100 && syringeUnits > 0 && syringeUnits < 2) {
    warnings.push({
      code: 'precision_low',
      message:
        'At this volume on a 100u barrel, normal measurement error is a large percentage of the intended amount.',
    });
  }

  // mg vs mcg off-by-1000 suspicion: dose unit mg but value looks like mcg scale vs vial
  let needsUnitConfirmation = false;
  let alternateInterpretation: ConverterSuccess['alternateInterpretation'];
  if (
    doseUnit === 'mg' &&
    vialUnit === 'mg' &&
    doseAmount >= 1 &&
    doseAmount <= vialAmount &&
    doseAmount / vialAmount > 0.2
  ) {
    // Possible: user meant mcg for dose (e.g. 250 mcg typed as 250 mg) — caught by exceeds vial often.
  }
  if (doseUnit === 'mg' && doseAmount < 0.01 && vialUnit === 'mg') {
    needsUnitConfirmation = true;
    const altDoseMg = doseAmount; // already mg; alternate as mcg means doseAmount mcg
    const altVolume = doseAmount / 1000 / concentrationPerMl;
    alternateInterpretation = {
      assumedDoseUnit: 'mcg',
      syringeUnits: altVolume * unitsPerMl,
    };
    warnings.push({
      code: 'unit_scale_suspect',
      message:
        'Dose is very small in mg. Confirm you did not mean mcg (1000x difference).',
    });
  }
  if (doseUnit === 'mcg' && doseAmount >= 1000 && vialUnit === 'mg') {
    needsUnitConfirmation = true;
    const asMg = doseAmount / 1000;
    const altVolume = asMg / concentrationPerMl;
    alternateInterpretation = {
      assumedDoseUnit: 'mg',
      syringeUnits: altVolume * unitsPerMl,
    };
    warnings.push({
      code: 'unit_scale_suspect',
      message:
        'Dose in mcg is 1000 or more. Confirm you did not mean mg (1000x difference).',
    });
  }

  return {
    ok: true,
    concentrationPerMl,
    volumeMl,
    syringeUnits,
    syringeUnitsDisplay: roundDisplay(syringeUnits, 2),
    volumeMlDisplay: roundDisplay(volumeMl, 4),
    concentrationDisplay: roundDisplay(concentrationPerMl, 4),
    warnings,
    needsUnitConfirmation,
    alternateInterpretation,
    resultStandardLabel:
      syringeStandard === 'U-100'
        ? 'Measured on a U-100 insulin syringe.'
        : 'Measured on a U-40 insulin syringe.',
  };
}

/** U-100 vs U-40 factor for identical mass/volume inputs. */
export function u100ToU40Factor(): number {
  return UNITS_PER_ML['U-100'] / UNITS_PER_ML['U-40']; // 2.5
}

export const CONVERTER_COPY = {
  subtitle: 'Converts values you enter into syringe units.',
  scaleInstruction: 'This is where your entered dose lands on the barrel.',
  bacShortcutsLabel: 'Common volumes, choose one.',
  nonAllowlistedHeading: 'No established dose exists for this compound.',
  layer3:
    'Converted from values you entered. Not a recommended dose. Educational use only, not medical advice.',
} as const;

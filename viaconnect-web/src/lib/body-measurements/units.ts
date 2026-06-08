// Prompt 179c: circumference unit conversion. Storage stays in the row's
// entry_unit (the existing body_tracker_circumference model); display converts.
// PURE, no IO.

export type MeasurementUnit = 'in' | 'cm';

const CM_PER_IN = 2.54;

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

// Convert a stored value from its entry unit to the requested display unit.
export function convertLength(value: number, from: MeasurementUnit, to: MeasurementUnit): number {
  if (from === to) return value;
  return from === 'cm' ? cmToIn(value) : inToCm(value);
}

// One decimal place is the precision the storage columns and the UI both use.
export function roundForDisplay(value: number): number {
  return Math.round(value * 10) / 10;
}

export function displayValue(value: number, from: MeasurementUnit, to: MeasurementUnit): number {
  return roundForDisplay(convertLength(value, from, to));
}

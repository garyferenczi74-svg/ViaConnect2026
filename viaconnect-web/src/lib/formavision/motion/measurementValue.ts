// Measurement value formatting for the FormaVision ring label (Prompt 210b, P2-T4b).
//
// The ring shows the selected region's real circumference in the active unit (in or
// cm). The geometry stores circumferences in meters, so this converts to the display
// unit and formats a clean label. An UNKNOWN region (no measurement, estimated) shows
// an explicit marker, never 0 and never a fabricated number: the honesty rule from
// the body model carries through to the label.
//
// Pure and deterministic so the conversion and the UNKNOWN branch are unit testable.

import type { MeasurementUnit } from '@/lib/body-tracker/circumference';

const METERS_PER_INCH = 0.0254;
const CM_PER_METER = 100;

// The marker shown when a region has no real measurement. Not a number, so it can
// never be mistaken for a measured value.
export const UNKNOWN_VALUE_MARKER = 'Not measured';

// Convert a circumference in meters to the display unit's numeric value.
export function circumferenceToUnit(circumferenceM: number, unit: MeasurementUnit): number {
  if (unit === 'cm') {
    return circumferenceM * CM_PER_METER;
  }
  return circumferenceM / METERS_PER_INCH;
}

// Format a circumference for the ring label. When estimated is true the value is
// UNKNOWN, so the marker is returned regardless of the underlying template number.
// The numeric path rounds to one decimal and appends the unit suffix.
export function formatRingValue(
  circumferenceM: number,
  unit: MeasurementUnit,
  estimated: boolean,
): string {
  if (estimated) {
    return UNKNOWN_VALUE_MARKER;
  }
  const value = circumferenceToUnit(circumferenceM, unit);
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}

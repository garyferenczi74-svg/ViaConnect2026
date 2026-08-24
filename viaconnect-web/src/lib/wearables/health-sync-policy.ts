// HealthKit / Health Connect connect policy: Connected only after a real persist.

export function shouldMarkHealthSourceConnected(input: {
  sampleCount: number;
  eventInserted: boolean;
}): boolean {
  return input.sampleCount > 0 && input.eventInserted === true;
}

export function isEmptyHealthBatch(sampleCount: number): boolean {
  return sampleCount <= 0;
}

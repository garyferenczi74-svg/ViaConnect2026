/** The only HealthKit type this release requests. Apple 5.1.3(i). */
export const HEALTHKIT_STEP_COUNT_READ = ["HKQuantityTypeIdentifierStepCount"] as const;

export interface StepSample {
  type: "steps";
  value: number | null;
  startDate: string | null;
  endDate: string | null;
  sourceApp: string | null;
  id: string;
}

export function normalizeStepSamples(raw: unknown): StepSample[] {
  if (!Array.isArray(raw)) return [];
  const out: StepSample[] = [];
  raw.forEach((row, index) => {
    if (typeof row !== "object" || row === null) return;
    const record = row as Record<string, unknown>;
    const valueRaw = record.value ?? record.quantity;
    const value = typeof valueRaw === "number" && Number.isFinite(valueRaw) ? valueRaw : null;
    const sourceName = typeof record.sourceName === "string" ? record.sourceName : null;
    const sourceBundle = typeof record.sourceBundleId === "string" ? record.sourceBundleId : null;
    out.push({
      type: "steps",
      value,
      startDate: typeof record.startDate === "string" ? record.startDate : null,
      endDate: typeof record.endDate === "string" ? record.endDate : null,
      sourceApp: sourceName ?? sourceBundle,
      id: typeof record.uuid === "string" && record.uuid.length > 0 ? record.uuid : `step_${index}`,
    });
  });
  return out;
}

// Calculate what changed between previous and current CAQ data

export interface Delta {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  direction: "improved" | "worsened" | "unchanged" | "added" | "removed" | "changed";
  phase: number;
}

function formatLabel(key: string): string {
  return key
    .replace(/_severity$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function calculateCAQDeltas(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
  phaseKey: string,
  phase: number
): Delta[] {
  const deltas: Delta[] = [];
  const prev = (previous || {}) as Record<string, { score?: number } | number | string>;
  const curr = (current || {}) as Record<string, { score?: number } | number | string>;

  for (const key of new Set([...Object.keys(prev), ...Object.keys(curr)])) {
    const prevVal = prev[key];
    const currVal = curr[key];

    // Handle symptom objects { score, description }
    const prevScore = typeof prevVal === "object" && prevVal !== null && "score" in prevVal ? prevVal.score : typeof prevVal === "number" ? prevVal : null;
    const currScore = typeof currVal === "object" && currVal !== null && "score" in currVal ? currVal.score : typeof currVal === "number" ? currVal : null;

    if (prevScore != null && currScore != null && prevScore !== currScore) {
      deltas.push({
        field: key,
        label: formatLabel(key),
        oldValue: prevScore,
        newValue: currScore,
        direction: currScore < prevScore ? "improved" : "worsened",
        phase,
      });
    } else if (typeof prevVal === "string" && typeof currVal === "string" && prevVal !== currVal) {
      deltas.push({ field: key, label: formatLabel(key), oldValue: prevVal, newValue: currVal, direction: "changed", phase });
    }
  }

  return deltas;
}

export function calculateAllDeltas(
  previousPhysical: Record<string, unknown>,
  currentPhysical: Record<string, unknown>,
  previousNeuro: Record<string, unknown>,
  currentNeuro: Record<string, unknown>,
  previousEmotional: Record<string, unknown>,
  currentEmotional: Record<string, unknown>,
): { deltas: Delta[]; improved: Delta[]; worsened: Delta[]; totalChanges: number } {
  const all = [
    ...calculateCAQDeltas(previousPhysical, currentPhysical, "physical", 3),
    ...calculateCAQDeltas(previousNeuro, currentNeuro, "neuro", 4),
    ...calculateCAQDeltas(previousEmotional, currentEmotional, "emotional", 5),
  ];

  return {
    deltas: all,
    improved: all.filter((d) => d.direction === "improved"),
    worsened: all.filter((d) => d.direction === "worsened"),
    totalChanges: all.length,
  };
}

// Prompt #105 §4.5 — top-N aggregation with practitioner consent redaction.

export interface PractitionerStat {
  practitionerId: string;
  displayName: string;
  consentGranted: boolean;
  metricValueCents: number;
}

export interface TopNRow {
  kind: 'practitioner' | 'other_bucket';
  displayName: string;
  metricValueCents: number;
  practitionerCount: number; // 1 for individual rows, N for the bucket
  practitionerIds?: string[]; // only populated for consenting individuals
}

/** Pure: §4.5 redaction pattern. Compute top N by metric; for each row,
 *  if consent granted keep identity, otherwise fold into a single
 *  "Other practitioners" bucket row. */
export function redactTopNByConsent(
  stats: readonly PractitionerStat[],
  topN: number,
): TopNRow[] {
  const sorted = [...stats].sort((a, b) => b.metricValueCents - a.metricValueCents);
  const headN = sorted.slice(0, topN);

  let bucketCount = 0;
  let bucketTotal = 0;
  const rows: TopNRow[] = [];

  for (const s of headN) {
    if (s.consentGranted) {
      rows.push({
        kind: 'practitioner',
        displayName: s.displayName,
        metricValueCents: s.metricValueCents,
        practitionerCount: 1,
        practitionerIds: [s.practitionerId],
      });
    } else {
      bucketCount += 1;
      bucketTotal += s.metricValueCents;
    }
  }

  if (bucketCount > 0) {
    rows.push({
      kind: 'other_bucket',
      displayName: `Other practitioners (n=${bucketCount})`,
      metricValueCents: bucketTotal,
      practitionerCount: bucketCount,
    });
  }

  // Re-sort the final mixed list by metric so the display order is stable.
  rows.sort((a, b) => b.metricValueCents - a.metricValueCents);
  return rows;
}

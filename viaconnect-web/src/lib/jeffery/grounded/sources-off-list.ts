/**
 * Consumer Sources deny list for Stage A Research Hub cites.
 * Marshall drafts / box digests / IG dumps / ViaCura / FormaVision / performance
 * never appear in Sources. URL host labels from the optional Hounddog lane
 * are allowed only when they do not match these keys.
 */

export interface OffListCiteFields {
  cite_id: string;
  label: string;
}

const OFF_LIST_RE =
  /peptide-education-staging|marshall[-_ ]?draft|via-?cura|formavision|\bglb\b|instagram\.com|hounddog_performance|hounddog_analytics_rollup|box[-_ ]?(yt|digest)|hounddog[-_ ]?digest/i;

export function isOffListSourceCite(cite: OffListCiteFields): boolean {
  const hay = `${cite.cite_id} ${cite.label}`.trim();
  if (!hay) return true;
  return OFF_LIST_RE.test(hay);
}

export function rejectOffListCites<T extends OffListCiteFields>(cites: T[]): T[] {
  return cites.filter((cite) => !isOffListSourceCite(cite));
}

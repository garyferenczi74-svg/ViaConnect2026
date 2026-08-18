/**
 * Prompt 222: Heads Up Health internal-strategy report validator.
 * Counts https:// as citations. Counts U+2013 / U+2014 as dashHits.
 */

export const REQUIRED_HEADSUP_SECTIONS: readonly string[] = [
  "## Classification and crawl method",
  "## Executive summary",
  "## Company and positioning",
  "## Complete offering map",
  "## Feature inventory matrix",
  "## Integration inventory",
  "## Pricing and packaging",
  "## Design and UX audit",
  "## Voice of customer",
  "## Head to head adopt or adapt",
  "## Head to head do better",
  "## Head to head missing",
  "## Threat assessment",
  "## Prioritized recommendations",
  "## Appendix crawl coverage",
  "## Appendix Jeffery review",
  "## Appendix remaining work",
];

export interface HeadsupReportAssertion {
  ok: boolean;
  missing: string[];
  dashHits: number;
  citationCount: number;
}

export function assertHeadsupReport(markdown: string): HeadsupReportAssertion {
  const missing = REQUIRED_HEADSUP_SECTIONS.filter(
    (heading) => !markdown.includes(heading)
  );
  const dashHits = (markdown.match(/[\u2013\u2014]/g) ?? []).length;
  const citationCount = (markdown.match(/https:\/\//g) ?? []).length;
  const ok =
    missing.length === 0 && dashHits === 0 && citationCount >= 15;
  return { ok, missing, dashHits, citationCount };
}

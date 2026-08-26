/**
 * Brief 54: Sherlock title / URL / platform / score / fetch-time.
 *
 * Legal homes: /admin/hounddog Research findings list, or Research Hub
 * (default). Not Content. Not hooks. Not pipeline. Not Overview KPI
 * last-sync. A hub digest is not a script — never insert into
 * hounddog_scripts or hounddog_pipeline.
 */

export interface HounddogResearchFinding {
  title: string;
  url: string | null;
  platform: string | null;
  score: number | null;
  fetchedAt: string | null;
}

/**
 * Default home is Research Hub. Do not pull digest titles into Hounddog
 * as if they were wired accounts.
 */
export function loadHounddogResearchFindings(): readonly HounddogResearchFinding[] {
  return [];
}

export function isHounddogScriptPayload(
  finding: HounddogResearchFinding,
): boolean {
  void finding;
  return false;
}

export function isHounddogPipelinePayload(
  finding: HounddogResearchFinding,
): boolean {
  void finding;
  return false;
}

export function isHounddogHookPayload(
  finding: HounddogResearchFinding,
): boolean {
  void finding;
  return false;
}

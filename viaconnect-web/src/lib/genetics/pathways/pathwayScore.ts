// Prompt 208a Module D: pathway aggregation.
//
// Biology is networks, not isolated switches. A single heterozygous MTHFR call
// means little alone; the methylation pathway IN AGGREGATE is what drives the
// methylfolate decision. This module aggregates a user's qualified variants into
// composite pathway loads with low/moderate/high bands.
//
// Pure and deterministic; never throws. Bands are 'low'|'moderate'|'high'
// (severityToken-compatible). rsIDs are real canonical methylation-cycle, detox,
// and vitamin-D-axis markers drawn from the platform's existing maps
// (clinicalSnps.ts, methylationPanelMap.ts, the snp_protocol_rules seed) - none
// invented. No em/en-dashes, no emojis.

export type PathwayKey = 'methylation' | 'detox_antioxidant' | 'vitamin_d';

export interface PathwayDefinition {
  key: PathwayKey;
  label: string;
  componentRsids: string[];
}

// Canonical component rsIDs per pathway (all real, from the platform's maps):
//  methylation: MTHFR C677T/A1298C, MTRR A66G, MTR A2756G, COMT V158M, CBS C699T
//  detox_antioxidant: GSTP1 I105V, CYP1B1 L432V, CYP1A2 *1F
//  vitamin_d: VDR FokI, VDR BsmI
export const PATHWAY_DEFINITIONS: PathwayDefinition[] = [
  {
    key: 'methylation',
    label: 'Methylation',
    componentRsids: ['rs1801133', 'rs1801131', 'rs1801394', 'rs1805087', 'rs4680', 'rs234706'],
  },
  {
    key: 'detox_antioxidant',
    label: 'Detoxification and antioxidant',
    componentRsids: ['rs1695', 'rs1056836', 'rs762551'],
  },
  {
    key: 'vitamin_d',
    label: 'Vitamin D axis',
    componentRsids: ['rs2228570', 'rs1544410'],
  },
];

/**
 * Zygosity weight: how many risk-allele copies the call carries.
 *   '+/+' -> 2, '+/-' (either order) -> 1, anything else ('-/-', null, '') -> 0.
 */
export function statusWeight(status: string | null): number {
  if (!status) return 0;
  const s = status.replace(/\s+/g, '');
  if (s === '+/+') return 2;
  if (s === '+/-' || s === '-/+') return 1;
  return 0;
}

export interface PathwayComponent {
  rsid: string;
  status: string | null;
  weight: number;
}

export interface PathwayScore {
  pathway: PathwayKey;
  component_variants: PathwayComponent[];
  composite_score: number;
  severity_band: 'low' | 'moderate' | 'high' | null;
}

/**
 * Band from the ABSOLUTE composite load (sum of risk-allele copies across the
 * pathway's present components), NOT a ratio. A single heterozygous variant
 * (load 1) is 'low'; the band only climbs as the aggregate load rises, so the
 * composite drives it rather than any single variant.
 *   load >= 4 -> 'high', load >= 2 -> 'moderate', else 'low'.
 */
function bandForLoad(load: number): 'low' | 'moderate' | 'high' {
  if (load >= 4) return 'high';
  if (load >= 2) return 'moderate';
  return 'low';
}

/**
 * Aggregate qualified variants into composite pathway scores. Only pathways with
 * at least one component variant present are returned (no empty pathways).
 */
export function computePathwayScores(
  variants: { rsid: string; status: string | null }[],
): PathwayScore[] {
  const byRsid = new Map<string, string | null>();
  for (const v of variants) {
    // Last write wins; callers pass one row per rsid.
    byRsid.set(v.rsid, v.status);
  }

  const scores: PathwayScore[] = [];
  for (const def of PATHWAY_DEFINITIONS) {
    const components: PathwayComponent[] = [];
    for (const rsid of def.componentRsids) {
      if (!byRsid.has(rsid)) continue;
      const status = byRsid.get(rsid) ?? null;
      components.push({ rsid, status, weight: statusWeight(status) });
    }
    if (components.length === 0) continue; // pathway not assessable for this user
    const composite = components.reduce((sum, c) => sum + c.weight, 0);
    scores.push({
      pathway: def.key,
      component_variants: components,
      composite_score: composite,
      severity_band: bandForLoad(composite),
    });
  }
  return scores;
}

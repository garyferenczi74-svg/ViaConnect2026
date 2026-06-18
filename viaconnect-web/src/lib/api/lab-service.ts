// Lab report parsing service with genetic context
// Provides genetically-informed biomarker classification

export interface GeneticProfile {
  gene: string;
  variant: string;
  rs_id: string;
  genotype: string;
  impact: 'low' | 'moderate' | 'high';
  category: string;
}

export interface OptimalRange {
  low: number;
  high: number;
}

export interface Biomarker {
  name: string;
  value: number;
  unit: string;
  reference_range_low: number;
  reference_range_high: number;
}

export interface EnrichedBiomarker extends Biomarker {
  genetic_optimal_low: number | null;
  genetic_optimal_high: number | null;
  status: string;
}

type BiomarkerStatus =
  | 'below_genetic_optimal'
  | 'above_genetic_optimal'
  | 'within_genetic_optimal'
  | 'below_standard'
  | 'above_standard'
  | 'within_standard';

function normalizeBiomarkerName(name: string): string {
  return name.toLowerCase().replace(/[\s\-]+/g, '_');
}

// Lab reports name the same analyte many ways ("Vitamin D, 25-Hydroxy",
// "25-OH Vitamin D", "hs-CRP"). Resolve to the canonical key the optimal-range
// table uses, so the overlay matches real report wording.
function canonicalBiomarkerKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('homocyst')) return 'homocysteine';
  if (n.includes('folate') || n.includes('folic')) return 'folate';
  if (n.includes('vitamin d') || n.includes('25-oh') || n.includes('25 oh') ||
      n.includes('hydroxyvitamin') || n.includes('calcidiol')) return 'vitamin_d';
  if (n.includes('crp') || n.includes('c-reactive') || n.includes('c reactive')) return 'hscrp';
  if (n.includes('b12') || n.includes('cobalamin')) return 'vitamin_b12';
  return normalizeBiomarkerName(name);
}

function findGeneProfile(
  geneticProfile: GeneticProfile[],
  gene: string
): GeneticProfile | undefined {
  return geneticProfile.find(
    (p) => p.gene.toUpperCase() === gene.toUpperCase()
  );
}

// The gene whose variant drives a biomarker's genetic-optimal range, for the
// "based on your VDR variant" attribution. Null when the biomarker has no
// genetic relationship in the table.
export function geneForBiomarker(name: string): string | null {
  switch (canonicalBiomarkerKey(name)) {
    case 'homocysteine':
    case 'folate':
      return 'MTHFR';
    case 'vitamin_d':
      return 'VDR';
    case 'hscrp':
      return 'IL6';
    case 'vitamin_b12':
      return 'MTR';
    default:
      return null;
  }
}

export function getGeneticOptimalRange(
  biomarkerName: string,
  geneticProfile: GeneticProfile[]
): OptimalRange | null {
  const normalized = canonicalBiomarkerKey(biomarkerName);

  switch (normalized) {
    case 'homocysteine': {
      const mthfr = findGeneProfile(geneticProfile, 'MTHFR');
      if (!mthfr) return null;
      // Genotype when present (raw upload), else impact (methylation report,
      // where the lab states +/+ +/- -/- rather than a literal genotype).
      if (mthfr.genotype === 'TT' || mthfr.impact === 'high') return { low: 5, high: 8 };
      if (mthfr.genotype === 'CT' || mthfr.impact === 'moderate') return { low: 5, high: 10 };
      return { low: 5, high: 12 };
    }

    case 'folate': {
      const mthfr = findGeneProfile(geneticProfile, 'MTHFR');
      if (!mthfr) return null;
      if (mthfr.impact === 'high' || mthfr.impact === 'moderate') {
        return { low: 12, high: 30 };
      }
      return { low: 5, high: 20 };
    }

    case 'vitamin_d': {
      const vdr = findGeneProfile(geneticProfile, 'VDR');
      if (!vdr) return null;
      // High end capped at 80 ng/mL: a VDR variant does not raise the vitamin D
      // toxicity threshold, and levels above ~100 trend toxic, so the optimal
      // target must not push toward that shoulder (Hannah safety review).
      if (vdr.impact === 'high') return { low: 60, high: 80 };
      return { low: 40, high: 80 };
    }

    case 'hscrp': {
      const il6 = findGeneProfile(geneticProfile, 'IL6');
      if (!il6) return null;
      if (il6.genotype === 'GG' || il6.impact === 'high') return { low: 0, high: 0.5 };
      return { low: 0, high: 1.0 };
    }

    case 'vitamin_b12': {
      const mtr = findGeneProfile(geneticProfile, 'MTR');
      if (!mtr) return null;
      if (mtr.impact === 'moderate' || mtr.impact === 'high') {
        return { low: 500, high: 1000 };
      }
      return { low: 300, high: 900 };
    }

    default:
      return null;
  }
}

export function classifyBiomarker(
  value: number,
  standardRange: { low: number; high: number },
  geneticRange?: OptimalRange | null
): BiomarkerStatus {
  // Check genetic range first if available
  if (geneticRange) {
    if (value < geneticRange.low) return 'below_genetic_optimal';
    if (value > geneticRange.high) return 'above_genetic_optimal';
    return 'within_genetic_optimal';
  }

  // Fall back to standard range
  if (value < standardRange.low) return 'below_standard';
  if (value > standardRange.high) return 'above_standard';
  return 'within_standard';
}

export function enrichLabResults(
  biomarkers: Biomarker[],
  geneticProfile: GeneticProfile[]
): EnrichedBiomarker[] {
  return biomarkers.map((biomarker) => {
    const geneticRange = getGeneticOptimalRange(biomarker.name, geneticProfile);

    const standardRange = {
      low: biomarker.reference_range_low,
      high: biomarker.reference_range_high,
    };

    const status = classifyBiomarker(biomarker.value, standardRange, geneticRange);

    return {
      ...biomarker,
      genetic_optimal_low: geneticRange?.low ?? null,
      genetic_optimal_high: geneticRange?.high ?? null,
      status,
    };
  });
}

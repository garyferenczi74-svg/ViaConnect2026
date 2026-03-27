// Lab report parsing service with genetic context
// Provides genetically-informed biomarker classification

interface GeneticProfile {
  gene: string;
  variant: string;
  rs_id: string;
  genotype: string;
  impact: 'low' | 'moderate' | 'high';
  category: string;
}

interface OptimalRange {
  low: number;
  high: number;
}

interface Biomarker {
  name: string;
  value: number;
  unit: string;
  reference_range_low: number;
  reference_range_high: number;
}

interface EnrichedBiomarker extends Biomarker {
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

function findGeneProfile(
  geneticProfile: GeneticProfile[],
  gene: string
): GeneticProfile | undefined {
  return geneticProfile.find(
    (p) => p.gene.toUpperCase() === gene.toUpperCase()
  );
}

export function getGeneticOptimalRange(
  biomarkerName: string,
  geneticProfile: GeneticProfile[]
): OptimalRange | null {
  const normalized = normalizeBiomarkerName(biomarkerName);

  switch (normalized) {
    case 'homocysteine': {
      const mthfr = findGeneProfile(geneticProfile, 'MTHFR');
      if (!mthfr) return null;
      if (mthfr.genotype === 'TT') return { low: 5, high: 8 };
      if (mthfr.genotype === 'CT') return { low: 5, high: 10 };
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
      if (vdr.impact === 'high') return { low: 60, high: 90 };
      return { low: 40, high: 80 };
    }

    case 'hscrp': {
      const il6 = findGeneProfile(geneticProfile, 'IL6');
      if (!il6) return null;
      if (il6.genotype === 'GG') return { low: 0, high: 0.5 };
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

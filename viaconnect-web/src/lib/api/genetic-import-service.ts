// Genetic data import and parsing service
// Supports 23andMe, AncestryDNA, Nebula, and other common formats

import { SupabaseClient } from '@supabase/supabase-js';

interface ParsedSNP {
  rsId: string;
  genotype: string;
}

interface TargetSNP {
  gene: string;
  rs_id: string;
  category: string;
  risk_genotypes_high: string[];
  risk_genotypes_moderate: string[];
}

interface GeneticProfileRecord {
  user_id: string;
  gene: string;
  variant: string;
  rs_id: string;
  genotype: string;
  impact: 'low' | 'moderate' | 'high';
  category: string;
  panel: string;
}

interface ImportResult {
  total_snps: number;
  matched_count: number;
  variants: GeneticProfileRecord[];
}

const TARGET_SNPS: TargetSNP[] = [
  {
    gene: 'MTHFR',
    rs_id: 'rs1801133',
    category: 'methylation',
    risk_genotypes_high: ['TT'],
    risk_genotypes_moderate: ['CT', 'TC'],
  },
  {
    gene: 'COMT',
    rs_id: 'rs4680',
    category: 'neurotransmitter',
    risk_genotypes_high: ['AA'],
    risk_genotypes_moderate: ['AG', 'GA'],
  },
  {
    gene: 'APOE',
    rs_id: 'rs429358',
    category: 'cardiovascular',
    risk_genotypes_high: ['CC'],
    risk_genotypes_moderate: ['CT', 'TC'],
  },
  {
    gene: 'CYP1A2',
    rs_id: 'rs762551',
    category: 'detoxification',
    risk_genotypes_high: ['CC'],
    risk_genotypes_moderate: ['AC', 'CA'],
  },
  {
    gene: 'VDR',
    rs_id: 'rs1544410',
    category: 'nutrient_metabolism',
    risk_genotypes_high: ['BB', 'TT'],
    risk_genotypes_moderate: ['Bb', 'CT', 'TC'],
  },
  {
    gene: 'MAOA',
    rs_id: 'rs6323',
    category: 'neurotransmitter',
    risk_genotypes_high: ['TT'],
    risk_genotypes_moderate: ['GT', 'TG'],
  },
  {
    gene: 'CLOCK',
    rs_id: 'rs1801260',
    category: 'circadian',
    risk_genotypes_high: ['CC'],
    risk_genotypes_moderate: ['TC', 'CT'],
  },
  {
    gene: 'FTO',
    rs_id: 'rs9939609',
    category: 'metabolism',
    risk_genotypes_high: ['AA'],
    risk_genotypes_moderate: ['AT', 'TA'],
  },
  {
    gene: 'BDNF',
    rs_id: 'rs6265',
    category: 'neurotransmitter',
    risk_genotypes_high: ['AA'],
    risk_genotypes_moderate: ['AG', 'GA'],
  },
  {
    gene: 'ACTN3',
    rs_id: 'rs1815739',
    category: 'fitness',
    risk_genotypes_high: ['TT'],
    risk_genotypes_moderate: ['CT', 'TC'],
  },
  {
    gene: 'ACE',
    rs_id: 'rs4341',
    category: 'cardiovascular',
    risk_genotypes_high: ['DD', 'GG'],
    risk_genotypes_moderate: ['ID', 'CG', 'GC'],
  },
  {
    gene: 'IL6',
    rs_id: 'rs1800795',
    category: 'inflammation',
    risk_genotypes_high: ['GG'],
    risk_genotypes_moderate: ['GC', 'CG'],
  },
  {
    gene: 'TNF',
    rs_id: 'rs1800629',
    category: 'inflammation',
    risk_genotypes_high: ['AA'],
    risk_genotypes_moderate: ['AG', 'GA'],
  },
  {
    gene: 'GSTT1',
    rs_id: 'GSTT1',
    category: 'detoxification',
    risk_genotypes_high: ['--', 'DD'],
    risk_genotypes_moderate: ['+-', 'ID'],
  },
  {
    gene: 'CYP2D6',
    rs_id: 'rs3892097',
    category: 'drug_metabolism',
    risk_genotypes_high: ['AA'],
    risk_genotypes_moderate: ['AG', 'GA'],
  },
];

export function parseRawGeneticFile(
  content: string,
  source: '23andme' | 'ancestrydna' | 'nebula' | 'other'
): ParsedSNP[] {
  const lines = content.split(/\r?\n/);
  const results: ParsedSNP[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split('\t');

    switch (source) {
      case '23andme': {
        // Format: rsid \t chrom \t pos \t genotype
        if (parts.length >= 4) {
          const rsId = parts[0].trim();
          const genotype = parts[3].trim();
          if (rsId && genotype) {
            results.push({ rsId, genotype });
          }
        }
        break;
      }

      case 'ancestrydna': {
        // Format: rsid \t chrom \t pos \t allele1 \t allele2
        if (parts.length >= 5) {
          const rsId = parts[0].trim();
          const allele1 = parts[3].trim();
          const allele2 = parts[4].trim();
          if (rsId && allele1 && allele2) {
            results.push({ rsId, genotype: allele1 + allele2 });
          }
        }
        break;
      }

      case 'nebula':
      case 'other':
      default: {
        // Try common formats: 4-col tab (like 23andme) or 5-col tab (like ancestry)
        if (parts.length >= 5) {
          const rsId = parts[0].trim();
          const allele1 = parts[3].trim();
          const allele2 = parts[4].trim();
          if (rsId && allele1 && allele2) {
            results.push({ rsId, genotype: allele1 + allele2 });
          }
        } else if (parts.length >= 4) {
          const rsId = parts[0].trim();
          const genotype = parts[3].trim();
          if (rsId && genotype) {
            results.push({ rsId, genotype });
          }
        }
        break;
      }
    }
  }

  return results;
}

export function determineImpact(
  targetSNP: TargetSNP,
  userGenotype: string
): 'low' | 'moderate' | 'high' {
  if (targetSNP.risk_genotypes_high.includes(userGenotype)) {
    return 'high';
  }
  if (targetSNP.risk_genotypes_moderate.includes(userGenotype)) {
    return 'moderate';
  }
  return 'low';
}

export async function processGeneticImport(
  userId: string,
  snps: ParsedSNP[],
  source: string,
  supabase: SupabaseClient
): Promise<ImportResult> {
  const snpMap = new Map<string, string>();
  for (const snp of snps) {
    snpMap.set(snp.rsId.toLowerCase(), snp.genotype);
  }

  const variants: GeneticProfileRecord[] = [];

  for (const target of TARGET_SNPS) {
    const userGenotype = snpMap.get(target.rs_id.toLowerCase());
    if (!userGenotype) continue;

    const impact = determineImpact(target, userGenotype);

    const record: GeneticProfileRecord = {
      user_id: userId,
      gene: target.gene,
      variant: `${target.gene} ${target.rs_id}`,
      rs_id: target.rs_id,
      genotype: userGenotype,
      impact,
      category: target.category,
      panel: 'imported',
    };

    variants.push(record);
  }

  // Upsert matched variants into genetic_profiles
  if (variants.length > 0) {
    const { error } = await supabase
      .from('genetic_profiles')
      .upsert(variants, { onConflict: 'user_id,rs_id' });

    if (error) {
      throw new Error(`Failed to upsert genetic profiles: ${error.message}`);
    }
  }

  return {
    total_snps: snps.length,
    matched_count: variants.length,
    variants,
  };
}

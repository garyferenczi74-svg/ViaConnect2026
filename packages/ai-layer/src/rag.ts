/**
 * ViaConnect GeneX360 - RAG (Retrieval-Augmented Generation) Pipeline
 *
 * Manages embeddings, vector similarity search, and context assembly
 * across 6 knowledge sources: product specs, clinical claims, genetic
 * library, interaction database, herbal materia medica, and COA database.
 */

import type {
  PatientContext,
  RAGContext,
  RAGChunk,
} from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmbeddingsTableRow {
  id: string;
  content: string;
  embedding: number[]; // vector(1536) placeholder
  metadata: Record<string, unknown>;
  source: 'product_specs' | 'clinical_claims' | 'genetic_library' | 'interaction_db' | 'herbal_materia_medica' | 'coa_database';
  createdAt: Date;
}

export interface VectorSearchParams {
  query: string;
  embedding?: number[];
  topK: number;
  threshold: number;
  sourceFilter?: string[];
}

export interface VectorSearchResult {
  chunk: RAGChunk;
  distance: number;
}

// ---------------------------------------------------------------------------
// Mock Seed Data (20 entries across 6 source types)
// ---------------------------------------------------------------------------

export const RAG_SEED_DATA: EmbeddingsTableRow[] = [
  // --- Product Specifications (4) ---
  {
    id: 'prod-001',
    content: 'FarmCeutica MethylGuard Plus: Methylated B-Complex featuring 5-MTHF (L-Methylfolate) 800mcg, Methylcobalamin 1000mcg, P5P 25mg, Riboflavin-5-Phosphate 10mg. Designed for MTHFR variant carriers. Third-party tested. GMP certified. Contains no folic acid.',
    embedding: [],
    metadata: { productId: 'FC-MG-001', sku: 'FC-MG-800', form: 'capsule', servingSize: '1 capsule' },
    source: 'product_specs',
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 'prod-002',
    content: 'FarmCeutica OmegaNeuro DHA: High-potency DHA 2000mg from microalgae (vegan). Triglyceride form for superior absorption. Molecular distillation removes heavy metals. Targeted for APOE E4 carriers and neurocognitive support.',
    embedding: [],
    metadata: { productId: 'FC-ON-001', sku: 'FC-ON-2000', form: 'softgel', servingSize: '2 softgels' },
    source: 'product_specs',
    createdAt: new Date('2025-02-01'),
  },
  {
    id: 'prod-003',
    content: 'FarmCeutica CurcuMax Phytosome: Curcumin phytosome complex 1000mg (Meriva technology). 29x higher bioavailability than standard curcumin. Anti-inflammatory support for TNF-alpha G308A carriers. With BioPerine 10mg.',
    embedding: [],
    metadata: { productId: 'FC-CM-001', sku: 'FC-CM-1000', form: 'capsule', servingSize: '2 capsules' },
    source: 'product_specs',
    createdAt: new Date('2025-02-15'),
  },
  {
    id: 'prod-004',
    content: 'FarmCeutica MagRestore Glycinate: Magnesium Bisglycinate 400mg elemental. Chelated for superior GI tolerance and absorption. Targeted for COMT Val158Met (Met/Met) slow metabolizers. Supports catecholamine regulation and sleep quality.',
    embedding: [],
    metadata: { productId: 'FC-MR-001', sku: 'FC-MR-400', form: 'capsule', servingSize: '2 capsules' },
    source: 'product_specs',
    createdAt: new Date('2025-03-01'),
  },

  // --- Clinical Claims Dossiers (3) ---
  {
    id: 'claim-001',
    content: 'Clinical Claims Dossier: Methylfolate in MTHFR C677T. Systematic review of 14 RCTs (n=2,847) demonstrates L-Methylfolate 800-1600mcg significantly reduces homocysteine levels in C677T carriers (mean reduction 22.4%, p<0.001). NNT=3 for homocysteine normalization.',
    embedding: [],
    metadata: { dossierVersion: '3.1', lastReview: '2025-01', approvalStatus: 'approved' },
    source: 'clinical_claims',
    createdAt: new Date('2025-01-20'),
  },
  {
    id: 'claim-002',
    content: 'Clinical Claims Dossier: DHA Supplementation in APOE E4 Carriers. Meta-analysis of 8 prospective cohort studies (n=12,450) shows DHA >=1.5g/day associated with 28% reduced risk of cognitive decline in E4 carriers (HR 0.72, 95% CI 0.58-0.89).',
    embedding: [],
    metadata: { dossierVersion: '2.0', lastReview: '2024-11', approvalStatus: 'approved' },
    source: 'clinical_claims',
    createdAt: new Date('2024-11-10'),
  },
  {
    id: 'claim-003',
    content: 'Clinical Claims Dossier: CoQ10 in Statin-Induced Myopathy. Cochrane review of 12 RCTs (n=1,776) confirms CoQ10 200mg daily reduces statin-associated muscle symptoms by 40% (RR 0.60, 95% CI 0.50-0.73). Ubiquinol form preferred for patients >60y.',
    embedding: [],
    metadata: { dossierVersion: '4.2', lastReview: '2024-12', approvalStatus: 'approved' },
    source: 'clinical_claims',
    createdAt: new Date('2024-12-15'),
  },

  // --- Genetic Target Library (4) ---
  {
    id: 'gene-001',
    content: 'MTHFR Gene Profile: Methylenetetrahydrofolate reductase. Key variants: C677T (rs1801133), A1298C (rs1801131). C677T TT genotype reduces enzyme activity to ~30%. Impacts folate metabolism, homocysteine clearance, methylation capacity. Primary targets: methylfolate, B12, B6.',
    embedding: [],
    metadata: { gene: 'MTHFR', chromosome: '1p36.22', omim: '607093' },
    source: 'genetic_library',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'gene-002',
    content: 'COMT Gene Profile: Catechol-O-Methyltransferase. Key variant: Val158Met (rs4680). Met/Met genotype: 3-4x slower catecholamine degradation. Impacts dopamine, norepinephrine, estrogen metabolism. High catechol sensitivity. Primary targets: magnesium, SAMe avoidance in some cases.',
    embedding: [],
    metadata: { gene: 'COMT', chromosome: '22q11.21', omim: '116790' },
    source: 'genetic_library',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'gene-003',
    content: 'APOE Gene Profile: Apolipoprotein E. Key variants: E2 (rs7412), E4 (rs429358). E4 allele: strongest genetic risk factor for late-onset Alzheimer (3x heterozygous, 12x homozygous). Impacts lipid metabolism, neuroinflammation. Primary targets: DHA, curcumin, phosphatidylcholine.',
    embedding: [],
    metadata: { gene: 'APOE', chromosome: '19q13.32', omim: '107741' },
    source: 'genetic_library',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'gene-004',
    content: 'CYP2D6 Gene Profile: Cytochrome P450 2D6. Highly polymorphic — over 100 alleles. Poor metabolizers (*4/*4, *5/*5): 5-10% of Caucasians. Ultra-rapid (*1xN): 1-2%. Impacts metabolism of 25% of all drugs. Key for pharmacogenomic dosing.',
    embedding: [],
    metadata: { gene: 'CYP2D6', chromosome: '22q13.2', omim: '124030' },
    source: 'genetic_library',
    createdAt: new Date('2025-01-01'),
  },

  // --- Interaction Database (3) ---
  {
    id: 'interact-001',
    content: "Drug-Supplement Interaction: Warfarin + Omega-3 Fish Oil. Severity: Moderate. Mechanism: Omega-3 fatty acids inhibit platelet aggregation via TXA2 pathway. Clinical significance: doses >3g/day may increase INR by 0.5-1.0 units. Monitoring: check INR within 7 days of starting. Management: limit to <=2g EPA+DHA if concurrent.",
    embedding: [],
    metadata: { severityLevel: 'moderate', interactionType: 'pharmacodynamic' },
    source: 'interaction_db',
    createdAt: new Date('2025-02-01'),
  },
  {
    id: 'interact-002',
    content: "Drug-Supplement Interaction: SSRIs + 5-HTP/Tryptophan. Severity: High. Mechanism: additive serotonergic activity. Risk of serotonin syndrome: agitation, hyperthermia, clonus, diaphoresis. Contraindicated combination. Applies to all SSRIs and SNRIs. Wash-out period: 2 weeks minimum.",
    embedding: [],
    metadata: { severityLevel: 'high', interactionType: 'pharmacodynamic' },
    source: 'interaction_db',
    createdAt: new Date('2025-02-01'),
  },
  {
    id: 'interact-003',
    content: "Drug-Supplement Interaction: Levothyroxine + Calcium/Iron/Magnesium. Severity: Moderate. Mechanism: divalent/trivalent cations chelate T4 in GI tract reducing absorption by 25-50%. Management: separate by 4 hours minimum. Morning thyroid med, evening minerals preferred.",
    embedding: [],
    metadata: { severityLevel: 'moderate', interactionType: 'pharmacokinetic' },
    source: 'interaction_db',
    createdAt: new Date('2025-02-01'),
  },

  // --- Herbal Materia Medica (3) ---
  {
    id: 'herbal-001',
    content: "Lion's Mane (Hericium erinaceus): Neurotrophic mushroom. Active compounds: hericenones (fruiting body), erinacines (mycelium). Mechanism: stimulates NGF and BDNF synthesis. Clinical evidence: RCT showed improved cognitive function in mild MCI (n=30, 16 weeks). Dose: 1000-3000mg daily. Safety: well-tolerated; rare GI upset. Relevant for BDNF Val66Met carriers.",
    embedding: [],
    metadata: { latinName: 'Hericium erinaceus', family: 'Hericiaceae', part: 'fruiting body + mycelium' },
    source: 'herbal_materia_medica',
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 'herbal-002',
    content: 'Ashwagandha (Withania somnifera): Adaptogenic herb. Active: withanolides (2.5-5%). Mechanism: modulates HPA axis, reduces cortisol, GABAergic activity. Clinical evidence: meta-analysis of 5 RCTs shows significant reduction in stress/anxiety (SMD -1.55, p<0.001). Dose: 300-600mg daily (KSM-66 extract). Caution: thyroid-stimulating effects — monitor in hyperthyroidism.',
    embedding: [],
    metadata: { latinName: 'Withania somnifera', family: 'Solanaceae', part: 'root' },
    source: 'herbal_materia_medica',
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 'herbal-003',
    content: 'Boswellia (Boswellia serrata): Anti-inflammatory resin. Active: boswellic acids (AKBA most potent). Mechanism: 5-LOX inhibition, NF-kB modulation. Clinical evidence: RCTs support efficacy in osteoarthritis (3 trials, n=440) and IBD. Dose: 300-500mg 3x daily (standardized to 30% AKBA). Synergy with curcumin for TNF-alpha G308A carriers.',
    embedding: [],
    metadata: { latinName: 'Boswellia serrata', family: 'Burseraceae', part: 'gum resin' },
    source: 'herbal_materia_medica',
    createdAt: new Date('2025-01-15'),
  },

  // --- COA (Certificate of Analysis) Database (3) ---
  {
    id: 'coa-001',
    content: 'COA: FarmCeutica MethylGuard Plus Batch FC-MG-2025-001. Testing lab: Eurofins Scientific. L-Methylfolate assay: 812mcg/capsule (101.5% label claim). Heavy metals: Pb <0.05ppm, As <0.02ppm, Cd <0.01ppm, Hg <0.005ppm — all within USP limits. Microbial: <10 CFU/g TPC, no pathogens detected. Dissolution: 98.2% at 45min.',
    embedding: [],
    metadata: { batchId: 'FC-MG-2025-001', labName: 'Eurofins', testDate: '2025-01-10', passedAll: true },
    source: 'coa_database',
    createdAt: new Date('2025-01-10'),
  },
  {
    id: 'coa-002',
    content: 'COA: FarmCeutica OmegaNeuro DHA Batch FC-ON-2025-003. Testing lab: NSF International. DHA assay: 2015mg/2 softgels (100.8% label claim). EPA: 180mg. Oxidation: peroxide value 1.2 meq/kg (limit <5), anisidine 4.1 (limit <20), TOTOX 6.5 (limit <26). Heavy metals: all within GOED limits. PCB: <0.09ppm.',
    embedding: [],
    metadata: { batchId: 'FC-ON-2025-003', labName: 'NSF International', testDate: '2025-02-05', passedAll: true },
    source: 'coa_database',
    createdAt: new Date('2025-02-05'),
  },
  {
    id: 'coa-003',
    content: 'COA: FarmCeutica CurcuMax Phytosome Batch FC-CM-2025-002. Testing lab: Alkemist Labs. Total curcuminoids: 1024mg/2 capsules (102.4% label claim). Phytosome complex verified via HPTLC. BioPerine assay: 10.2mg. Solvent residuals: ND. Pesticides: 524 compounds screened, all ND. Allergen-free verified.',
    embedding: [],
    metadata: { batchId: 'FC-CM-2025-002', labName: 'Alkemist Labs', testDate: '2025-02-20', passedAll: true },
    source: 'coa_database',
    createdAt: new Date('2025-02-20'),
  },
];

// ---------------------------------------------------------------------------
// In-memory store (mock vector DB)
// ---------------------------------------------------------------------------

let embeddingsStore: EmbeddingsTableRow[] = [];

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Generate a mock 1536-dimensional embedding vector for the given text.
 * In production this would call OpenAI text-embedding-3-small or similar.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Deterministic-ish seed based on text content for consistency
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  }

  const embedding: number[] = new Array(1536);
  for (let i = 0; i < 1536; i++) {
    // Simple pseudo-random based on seed + index
    seed = (seed * 16807 + 0) % 2147483647;
    embedding[i] = (seed / 2147483647) * 2 - 1; // normalize to [-1, 1]
  }

  return embedding;
}

/**
 * Perform vector similarity search against the in-memory store.
 * Mock implementation uses keyword matching to simulate semantic search.
 */
export async function vectorSimilaritySearch(
  params: VectorSearchParams,
): Promise<VectorSearchResult[]> {
  const store = embeddingsStore.length > 0 ? embeddingsStore : RAG_SEED_DATA;
  const queryTerms = params.query.toLowerCase().split(/\s+/).filter((t) => t.length > 3);

  // Apply source filter
  let candidates = store;
  if (params.sourceFilter && params.sourceFilter.length > 0) {
    candidates = store.filter((row) => params.sourceFilter!.includes(row.source));
  }

  // Score each candidate by keyword overlap (mock semantic similarity)
  const scored: VectorSearchResult[] = candidates.map((row) => {
    const contentLower = row.content.toLowerCase();
    let matchCount = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        matchCount++;
      }
    }
    const relevanceScore = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
    // Convert to cosine-like distance (lower = more similar)
    const distance = 1 - relevanceScore;

    return {
      chunk: {
        id: row.id,
        content: row.content,
        source: row.source,
        relevanceScore,
        metadata: row.metadata,
      },
      distance,
    };
  });

  // Filter by threshold, sort by distance ascending, take topK
  return scored
    .filter((r) => r.distance <= (1 - params.threshold))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, params.topK);
}

/**
 * Build a full RAG context from a query string.
 * Generates embedding, searches vector store, assembles context.
 */
export async function buildRAGContext(
  query: string,
  topK: number = 5,
  sourceFilter?: string[],
): Promise<RAGContext> {
  const embedding = await generateEmbedding(query);

  const results = await vectorSimilaritySearch({
    query,
    embedding,
    topK,
    threshold: 0.1, // low threshold for broader retrieval
    sourceFilter,
  });

  const chunks: RAGChunk[] = results.map((r) => r.chunk);
  const totalRelevance = chunks.reduce((sum, c) => sum + c.relevanceScore, 0);

  return {
    chunks,
    totalRelevance,
  };
}

/**
 * Seed the in-memory embeddings store with mock data.
 * Returns stats about seeded entries per source.
 */
export async function seedEmbeddings(): Promise<{
  seeded: number;
  sources: Record<string, number>;
}> {
  const sources: Record<string, number> = {};

  embeddingsStore = await Promise.all(
    RAG_SEED_DATA.map(async (row) => {
      const embedding = await generateEmbedding(row.content);
      sources[row.source] = (sources[row.source] ?? 0) + 1;
      return { ...row, embedding };
    }),
  );

  return {
    seeded: embeddingsStore.length,
    sources,
  };
}

/**
 * Get RAG context tailored to a specific patient's profile.
 * Incorporates genomic variants, medications, and conditions into the search.
 */
export async function getContextForPatient(
  patientContext: PatientContext,
  query: string,
): Promise<RAGContext> {
  // Build an enriched query incorporating patient-specific terms
  const enrichmentParts: string[] = [query];

  if (patientContext.genomicProfile) {
    const geneTerms = patientContext.genomicProfile
      .map((v) => `${v.gene} ${v.variant} ${v.genotype}`)
      .join(' ');
    enrichmentParts.push(geneTerms);
  }

  if (patientContext.medications && patientContext.medications.length > 0) {
    enrichmentParts.push(`medications: ${patientContext.medications.join(' ')}`);
  }

  if (patientContext.conditions && patientContext.conditions.length > 0) {
    enrichmentParts.push(`conditions: ${patientContext.conditions.join(' ')}`);
  }

  const enrichedQuery = enrichmentParts.join(' ');

  // Search across all sources with higher topK for patient context
  const context = await buildRAGContext(enrichedQuery, 8);

  // Boost relevance for genetic library matches when patient has genomic data
  if (patientContext.genomicProfile && patientContext.genomicProfile.length > 0) {
    for (const chunk of context.chunks) {
      if (chunk.source === 'genetic_library') {
        chunk.relevanceScore = Math.min(1.0, chunk.relevanceScore * 1.3);
      }
    }
    // Recalculate total relevance
    context.totalRelevance = context.chunks.reduce((sum, c) => sum + c.relevanceScore, 0);
  }

  return context;
}

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecommendRequest {
  patientId: string;
  focusArea?: 'methylation' | 'detox' | 'inflammation' | 'cognitive' | 'immune' | 'cardiovascular';
  forceRefresh?: boolean;
}

interface Citation {
  source: string;
  title: string;
  pmid?: string;
  url?: string;
  grade?: string;
}

interface SupplementRecommendation {
  productId: string;
  productName: string;
  geneticRationale: string;
  dosage: string;
  frequency: string;
  confidenceScore: number;
  evidenceGrade: string;
  citationChain: Citation[];
  interactionStatus: 'safe' | 'monitor' | 'avoid';
  agreementScore: number;
  tier1RuleRef?: string;
}

interface ConsensusMetadata {
  sourcesQueried: number;
  averageAgreement: number;
  processingTimeMs: number;
  tier1RulesApplied: number;
  safetyChecksPassed: boolean;
}

interface RecommendResponse {
  patientId: string;
  recommendations: SupplementRecommendation[];
  consensusMetadata: ConsensusMetadata;
  cachedAt?: string;
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// In-memory cache (mock)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const recommendationCache = new Map<
  string,
  { data: RecommendResponse; cachedAt: Date; expiresAt: Date }
>();

function getCacheKey(patientId: string, focusArea?: string): string {
  return `${patientId}:${focusArea ?? 'all'}`;
}

// ---------------------------------------------------------------------------
// Mock patient data
// ---------------------------------------------------------------------------

const MOCK_PATIENTS: Record<string, {
  name: string;
  variants: string[];
  riskFactors: string[];
  currentMedications: string[];
}> = {
  'patient-1': {
    name: 'Maria Santos',
    variants: [
      'MTHFR C677T heterozygous (rs1801133 CT)',
      'COMT V158M homozygous slow (rs4680 AA)',
      'VDR Taq (rs731236 CT)',
      'APOE 3/4 (rs429358/rs7412)',
      'SOD2 A16V (rs4880 CT)',
    ],
    riskFactors: [
      'Elevated homocysteine (14.2 umol/L)',
      'Cardiovascular family history',
      'Alzheimer\'s family history (maternal)',
      'Chronic fatigue',
      'Sleep quality 4/10',
    ],
    currentMedications: [],
  },
};

// ---------------------------------------------------------------------------
// Mock five-source consensus engine
// ---------------------------------------------------------------------------

function runFiveSourceConsensus(
  patientId: string,
  _focusArea?: string,
): { recommendations: SupplementRecommendation[]; metadata: ConsensusMetadata } {
  const startTime = Date.now();

  const patient = MOCK_PATIENTS[patientId];
  if (!patient) {
    return {
      recommendations: [],
      metadata: {
        sourcesQueried: 0,
        averageAgreement: 0,
        processingTimeMs: Date.now() - startTime,
        tier1RulesApplied: 0,
        safetyChecksPassed: true,
      },
    };
  }

  // Simulated consensus across 5 sources:
  // 1. GeneX360 Tier-1 Rule Engine
  // 2. Claude (LLM clinical reasoning)
  // 3. PubMed RAG corpus
  // 4. Nutrigenomic knowledgebase
  // 5. Clinical practice guidelines

  const recommendations: SupplementRecommendation[] = [
    {
      productId: 'SUPP-001',
      productName: 'Methylated B-Complex (with L-5-MTHF & Methylcobalamin)',
      geneticRationale:
        'MTHFR C677T heterozygous (rs1801133 CT) reduces folate metabolism by ~35%. ' +
        'COMT slow status (rs4680 AA) requires careful methylation support — start low at 400 mcg L-5-MTHF ' +
        'to avoid catecholamine buildup. Replaces current folic acid-containing multivitamin.',
      dosage: '1 capsule (400 mcg L-5-MTHF, 500 mcg methylcobalamin, 50 mg P-5-P)',
      frequency: 'Once daily with breakfast; titrate to 800 mcg L-5-MTHF after 4 weeks if tolerated',
      confidenceScore: 0.95,
      evidenceGrade: 'A',
      citationChain: [
        { source: 'PubMed', title: 'Methylfolate vs folic acid in MTHFR C677T carriers: a meta-analysis', pmid: '32456789', url: 'https://pubmed.ncbi.nlm.nih.gov/32456789', grade: 'A' },
        { source: 'PubMed', title: 'COMT polymorphisms and methylation tolerance thresholds', pmid: '31234567', url: 'https://pubmed.ncbi.nlm.nih.gov/31234567', grade: 'B' },
        { source: 'PubMed', title: 'Homocysteine reduction with 5-MTHF supplementation', pmid: '29876543', url: 'https://pubmed.ncbi.nlm.nih.gov/29876543', grade: 'A' },
        { source: 'Clinical Guidelines', title: 'MTHFR-informed supplementation protocols (ACMG, 2023)', grade: 'A' },
      ],
      interactionStatus: 'safe',
      agreementScore: 0.80,
      tier1RuleRef: 'RULE-MTHFR-001',
    },
    {
      productId: 'SUPP-002',
      productName: 'Magnesium Glycinate 300 mg',
      geneticRationale:
        'COMT V158M homozygous slow (rs4680 AA) leads to impaired catecholamine clearance. ' +
        'Magnesium is a critical cofactor for COMT enzyme activity and has demonstrated anxiolytic ' +
        'effects. Glycinate form provides superior bioavailability and calming glycine co-benefit for ' +
        'reported sleep issues (4/10 quality).',
      dosage: '300 mg elemental magnesium (as glycinate)',
      frequency: 'Once daily in the evening, 1 hour before bed',
      confidenceScore: 0.92,
      evidenceGrade: 'A',
      citationChain: [
        { source: 'PubMed', title: 'Magnesium and anxiety: systematic review of RCTs', pmid: '28445426', url: 'https://pubmed.ncbi.nlm.nih.gov/28445426', grade: 'A' },
        { source: 'PubMed', title: 'Magnesium as COMT cofactor: kinetic analysis', pmid: '27654321', url: 'https://pubmed.ncbi.nlm.nih.gov/27654321', grade: 'B' },
        { source: 'PubMed', title: 'Glycine and sleep quality: a randomized controlled trial', pmid: '25533534', url: 'https://pubmed.ncbi.nlm.nih.gov/25533534', grade: 'A' },
        { source: 'Nutrigenomic KB', title: 'COMT cofactor requirements by genotype', grade: 'B' },
        { source: 'Clinical Guidelines', title: 'Magnesium supplementation in functional medicine (IFM, 2022)', grade: 'B' },
      ],
      interactionStatus: 'safe',
      agreementScore: 1.0,
    },
    {
      productId: 'SUPP-003',
      productName: 'Vitamin D3 5000 IU',
      geneticRationale:
        'VDR Taq polymorphism (rs731236 CT) reduces vitamin D receptor efficiency, requiring higher ' +
        'circulating 25(OH)D to achieve equivalent biological effect. Current 2000 IU/day likely insufficient. ' +
        'APOE 3/4 status adds cardiovascular and neurodegenerative risk where vitamin D is protective.',
      dosage: '5000 IU cholecalciferol with 100 mcg K2 (MK-7)',
      frequency: 'Once daily with a fat-containing meal',
      confidenceScore: 0.90,
      evidenceGrade: 'A',
      citationChain: [
        { source: 'PubMed', title: 'VDR polymorphisms and vitamin D dose-response', pmid: '21646368', url: 'https://pubmed.ncbi.nlm.nih.gov/21646368', grade: 'A' },
        { source: 'PubMed', title: 'Vitamin D and APOE genotype interactions in neurodegeneration', pmid: '33456789', url: 'https://pubmed.ncbi.nlm.nih.gov/33456789', grade: 'B' },
        { source: 'PubMed', title: 'Vitamin D3 with K2 for cardiovascular outcomes', pmid: '30567890', url: 'https://pubmed.ncbi.nlm.nih.gov/30567890', grade: 'A' },
        { source: 'Clinical Guidelines', title: 'Endocrine Society vitamin D clinical practice guideline (2024)', grade: 'A' },
      ],
      interactionStatus: 'safe',
      agreementScore: 0.80,
      tier1RuleRef: 'RULE-VDR-003',
    },
    {
      productId: 'SUPP-004',
      productName: 'Omega-3 DHA/EPA (Triglyceride Form)',
      geneticRationale:
        'APOE 3/4 carrier status (rs429358/rs7412) significantly elevates cardiovascular and neurocognitive ' +
        'risk. High-dose DHA has shown preferential benefit in APOE4 carriers for both lipid profiles and ' +
        'amyloid processing. Current fish oil dose (1000 mg) is sub-therapeutic.',
      dosage: '2000 mg total omega-3 (1200 mg DHA / 800 mg EPA) in triglyceride form',
      frequency: 'Divided: 1000 mg with breakfast, 1000 mg with dinner',
      confidenceScore: 0.88,
      evidenceGrade: 'B',
      citationChain: [
        { source: 'PubMed', title: 'APOE4 and DHA: genotype-specific neuroprotective effects', pmid: '34567890', url: 'https://pubmed.ncbi.nlm.nih.gov/34567890', grade: 'B' },
        { source: 'PubMed', title: 'High-dose omega-3 in cardiovascular risk reduction: meta-analysis', pmid: '31987654', url: 'https://pubmed.ncbi.nlm.nih.gov/31987654', grade: 'A' },
        { source: 'PubMed', title: 'Triglyceride vs ethyl ester omega-3 bioavailability', pmid: '28765432', url: 'https://pubmed.ncbi.nlm.nih.gov/28765432', grade: 'B' },
        { source: 'Nutrigenomic KB', title: 'APOE4 carrier fatty acid metabolism pathways', grade: 'B' },
      ],
      interactionStatus: 'safe',
      agreementScore: 0.80,
      tier1RuleRef: 'RULE-APOE-002',
    },
    {
      productId: 'SUPP-005',
      productName: 'CoQ10 (Ubiquinol) 200 mg',
      geneticRationale:
        'SOD2 A16V polymorphism (rs4880 CT) reduces mitochondrial superoxide dismutase activity, ' +
        'increasing oxidative stress in the mitochondria. CoQ10 as ubiquinol provides direct ' +
        'mitochondrial antioxidant support and is a critical electron carrier in the ETC. ' +
        'Also supports cardiovascular health given APOE 3/4 risk profile.',
      dosage: '200 mg ubiquinol (reduced form)',
      frequency: 'Once daily with a fat-containing meal',
      confidenceScore: 0.85,
      evidenceGrade: 'B',
      citationChain: [
        { source: 'PubMed', title: 'SOD2 polymorphisms and mitochondrial oxidative stress', pmid: '30123456', url: 'https://pubmed.ncbi.nlm.nih.gov/30123456', grade: 'B' },
        { source: 'PubMed', title: 'CoQ10 supplementation in mitochondrial dysfunction: systematic review', pmid: '29654321', url: 'https://pubmed.ncbi.nlm.nih.gov/29654321', grade: 'B' },
        { source: 'PubMed', title: 'Ubiquinol vs ubiquinone bioavailability in adults over 40', pmid: '27890123', url: 'https://pubmed.ncbi.nlm.nih.gov/27890123', grade: 'B' },
      ],
      interactionStatus: 'safe',
      agreementScore: 0.60,
      tier1RuleRef: 'RULE-SOD2-001',
    },
    {
      productId: 'SUPP-006',
      productName: 'Curcumin BCM-95 500 mg',
      geneticRationale:
        'Multi-target anti-inflammatory support addressing APOE4-associated neuroinflammation and ' +
        'SOD2-related oxidative stress. BCM-95 formulation provides ~7x bioavailability over standard ' +
        'curcumin. Supports NF-kB modulation relevant to COMT slow metabolizer inflammatory patterns.',
      dosage: '500 mg BCM-95 curcumin extract',
      frequency: 'Twice daily with meals (1000 mg total)',
      confidenceScore: 0.82,
      evidenceGrade: 'B',
      citationChain: [
        { source: 'PubMed', title: 'Curcumin and neuroinflammation in APOE4 carriers', pmid: '33789012', url: 'https://pubmed.ncbi.nlm.nih.gov/33789012', grade: 'B' },
        { source: 'PubMed', title: 'BCM-95 curcumin bioavailability: pharmacokinetic study', pmid: '31456789', url: 'https://pubmed.ncbi.nlm.nih.gov/31456789', grade: 'B' },
        { source: 'PubMed', title: 'Curcumin and anticoagulant interaction potential', pmid: '28901234', url: 'https://pubmed.ncbi.nlm.nih.gov/28901234', grade: 'C' },
      ],
      interactionStatus: 'monitor',
      agreementScore: 0.60,
    },
    {
      productId: 'SUPP-007',
      productName: 'NAC (N-Acetylcysteine) 600 mg',
      geneticRationale:
        'SOD2 A16V (rs4880 CT) reduces mitochondrial antioxidant defense. NAC is a glutathione ' +
        'precursor that supports Phase II detoxification and mitigates oxidative stress upstream of SOD2. ' +
        'Also supports homocysteine metabolism via the transsulfuration pathway, complementing methylation ' +
        'support from the B-complex.',
      dosage: '600 mg N-Acetylcysteine',
      frequency: 'Once daily on an empty stomach (30 min before a meal)',
      confidenceScore: 0.78,
      evidenceGrade: 'B',
      citationChain: [
        { source: 'PubMed', title: 'NAC and glutathione repletion: dose-response in oxidative stress', pmid: '30234567', url: 'https://pubmed.ncbi.nlm.nih.gov/30234567', grade: 'B' },
        { source: 'PubMed', title: 'Transsulfuration pathway and homocysteine: role of NAC', pmid: '28567890', url: 'https://pubmed.ncbi.nlm.nih.gov/28567890', grade: 'B' },
        { source: 'PubMed', title: 'NAC in neurodegenerative disease prevention', pmid: '32678901', url: 'https://pubmed.ncbi.nlm.nih.gov/32678901', grade: 'C' },
      ],
      interactionStatus: 'safe',
      agreementScore: 0.60,
    },
    {
      productId: 'SUPP-008',
      productName: 'L-Theanine 200 mg',
      geneticRationale:
        'COMT V158M homozygous slow (rs4680 AA) is associated with elevated catecholamines and anxiety. ' +
        'L-Theanine promotes alpha-wave brain activity and modulates glutamate/GABA balance without sedation. ' +
        'Synergistic with magnesium for calming effect. Supports reported anxiety and sleep concerns.',
      dosage: '200 mg L-Theanine',
      frequency: 'Once or twice daily; can be taken with morning caffeine or in the evening',
      confidenceScore: 0.75,
      evidenceGrade: 'C',
      citationChain: [
        { source: 'PubMed', title: 'L-Theanine and alpha-wave activity: EEG study', pmid: '29345678', url: 'https://pubmed.ncbi.nlm.nih.gov/29345678', grade: 'B' },
        { source: 'PubMed', title: 'L-Theanine anxiolytic effects: randomized double-blind trial', pmid: '27456789', url: 'https://pubmed.ncbi.nlm.nih.gov/27456789', grade: 'B' },
        { source: 'PubMed', title: 'Theanine-caffeine synergy on cognitive performance', pmid: '26789012', url: 'https://pubmed.ncbi.nlm.nih.gov/26789012', grade: 'C' },
      ],
      interactionStatus: 'safe',
      agreementScore: 0.60,
    },
  ];

  const processingTimeMs = Date.now() - startTime + 1847; // Add simulated AI processing time

  const agreementScores = recommendations.map((r) => r.agreementScore);
  const averageAgreement =
    agreementScores.reduce((sum, s) => sum + s, 0) / agreementScores.length;

  const tier1Count = recommendations.filter((r) => r.tier1RuleRef).length;

  const metadata: ConsensusMetadata = {
    sourcesQueried: 5,
    averageAgreement: Math.round(averageAgreement * 100) / 100,
    processingTimeMs,
    tier1RulesApplied: tier1Count,
    safetyChecksPassed: true,
  };

  return { recommendations, metadata };
}

// ---------------------------------------------------------------------------
// POST — Generate recommendations
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecommendRequest;

    if (!body.patientId || typeof body.patientId !== 'string') {
      return Response.json(
        { error: 'patientId is required and must be a string' },
        { status: 400 },
      );
    }

    const validFocusAreas = ['methylation', 'detox', 'inflammation', 'cognitive', 'immune', 'cardiovascular'];
    if (body.focusArea && !validFocusAreas.includes(body.focusArea)) {
      return Response.json(
        { error: `focusArea must be one of: ${validFocusAreas.join(', ')}` },
        { status: 400 },
      );
    }

    if (!MOCK_PATIENTS[body.patientId]) {
      return Response.json(
        { error: `Patient not found: ${body.patientId}` },
        { status: 404 },
      );
    }

    // Check cache
    const cacheKey = getCacheKey(body.patientId, body.focusArea);

    if (!body.forceRefresh) {
      const cached = recommendationCache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        return Response.json({
          ...cached.data,
          cachedAt: cached.cachedAt.toISOString(),
          expiresAt: cached.expiresAt.toISOString(),
        });
      }
    }

    // Run consensus engine
    const { recommendations, metadata } = runFiveSourceConsensus(
      body.patientId,
      body.focusArea,
    );

    const response: RecommendResponse = {
      patientId: body.patientId,
      recommendations,
      consensusMetadata: metadata,
    };

    // Cache the result
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    recommendationCache.set(cacheKey, {
      data: response,
      cachedAt: now,
      expiresAt,
    });

    return Response.json({
      ...response,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[ai/recommend] POST error:', error);
    return Response.json(
      { error: 'Internal server error generating recommendations' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Retrieve cached recommendations
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return Response.json(
        { error: 'patientId query parameter is required' },
        { status: 400 },
      );
    }

    // Look for any cached result for this patient (check all focus areas)
    const focusArea = searchParams.get('focusArea') ?? undefined;
    const cacheKey = getCacheKey(patientId, focusArea);
    const cached = recommendationCache.get(cacheKey);

    if (!cached || cached.expiresAt <= new Date()) {
      return Response.json(
        {
          error: 'No cached recommendations found for this patient',
          hint: 'Send a POST request to /api/ai/recommend to generate recommendations',
          patientId,
        },
        { status: 404 },
      );
    }

    return Response.json({
      ...cached.data,
      cachedAt: cached.cachedAt.toISOString(),
      expiresAt: cached.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[ai/recommend] GET error:', error);
    return Response.json(
      { error: 'Internal server error retrieving recommendations' },
      { status: 500 },
    );
  }
}

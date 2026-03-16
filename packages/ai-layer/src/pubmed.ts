import { Citation } from './types';

export interface PubMedConfig {
  baseUrl: string;
  apiKey: string;
  retMax: number;
}

export const DEFAULT_PUBMED_CONFIG: PubMedConfig = {
  baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
  apiKey: process.env.NCBI_API_KEY || '',
  retMax: 20,
};

export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi: string;
  meshTerms: string[];
}

/**
 * Searches PubMed via E-utilities esearch (mock implementation).
 */
export async function searchPubMed(
  query: string,
  maxResults: number = 20
): Promise<{ pmids: string[]; count: number }> {
  // Mock: generate realistic PMIDs based on query
  const baseId = 38000000 + Math.abs(hashCode(query)) % 2000000;
  const count = Math.min(maxResults, 15);
  const pmids: string[] = [];

  for (let i = 0; i < count; i++) {
    pmids.push(String(baseId + i * 137));
  }

  return {
    pmids,
    count: 247 + (Math.abs(hashCode(query)) % 500), // total matches in PubMed
  };
}

/**
 * Fetches full article details via E-utilities efetch (mock implementation).
 */
export async function fetchArticles(pmids: string[]): Promise<PubMedArticle[]> {
  const mockJournals = [
    'Nutrients',
    'Journal of Personalized Medicine',
    'Pharmacogenomics',
    'Clinical Pharmacology & Therapeutics',
    'American Journal of Clinical Nutrition',
    'Frontiers in Nutrition',
    'European Journal of Clinical Nutrition',
    'Journal of Nutritional Biochemistry',
  ];

  const mockTitles = [
    'Pharmacogenomic-guided supplementation improves clinical outcomes: a randomized trial',
    'MTHFR C677T and methylfolate response: systematic review and meta-analysis',
    'Vitamin D receptor polymorphisms predict supplementation response in diverse populations',
    'COMT Val158Met and magnesium metabolism: mechanistic insights',
    'Multi-gene panel testing for personalized nutrition: clinical utility assessment',
    'Folate pathway genetics and homocysteine reduction strategies',
    'Nutrigenomics in clinical practice: current evidence and future directions',
    'Genotype-guided dosing of micronutrients: a comprehensive review',
    'CYP enzyme polymorphisms and supplement bioavailability',
    'Genomic predictors of vitamin B12 status and supplementation needs',
  ];

  const mockAuthors = [
    ['Zhang Y', 'Smith JR', 'Johnson KL', 'Williams A'],
    ['Garcia-Lopez M', 'Chen W', 'Roberts TH'],
    ['Anderson PR', 'Kim SJ', 'Patel NR', 'Brown EL', 'Davis MC'],
    ['Thompson RA', 'Lee HK'],
    ['Martinez-Cruz F', 'Wang L', 'O\'Brien SE', 'Taylor JM'],
  ];

  return pmids.map((pmid, idx) => ({
    pmid,
    title: mockTitles[idx % mockTitles.length],
    authors: mockAuthors[idx % mockAuthors.length],
    journal: mockJournals[idx % mockJournals.length],
    year: 2023 + (idx % 3),
    abstract:
      `Background: This study investigates the role of pharmacogenomic variants in ` +
      `personalized supplementation strategies. Methods: ${80 + idx * 10} participants were enrolled ` +
      `in a randomized controlled trial comparing genotype-guided vs. standard supplementation. ` +
      `Results: The genotype-guided group showed statistically significant improvements in primary ` +
      `outcomes (p<0.${1 + idx}). Conclusion: Pharmacogenomic testing can meaningfully improve ` +
      `supplementation outcomes in clinical practice.`,
    doi: `10.1234/nutrigenomics.2024.${pmid}`,
    meshTerms: [
      'Pharmacogenomics',
      'Dietary Supplements',
      'Precision Medicine',
      'Nutritional Genomics',
      idx % 2 === 0 ? 'Folic Acid' : 'Vitamin D',
    ],
  }));
}

/**
 * Finds related articles via E-utilities elink (mock implementation).
 */
export async function getRelatedArticles(pmid: string): Promise<string[]> {
  const baseId = parseInt(pmid, 10);
  if (isNaN(baseId)) {
    return [];
  }

  return [
    String(baseId + 42),
    String(baseId + 187),
    String(baseId + 293),
    String(baseId + 510),
    String(baseId + 784),
  ];
}

/**
 * Cross-references a recommendation against PubMed literature (mock implementation).
 * Returns a peer-reviewed badge if 3+ supporting publications are found.
 */
export async function validateRecommendation(
  recommendation: string,
  minPublications: number = 3
): Promise<{
  validated: boolean;
  articleCount: number;
  citations: Citation[];
  peerReviewedBadge: boolean;
}> {
  // Search for supporting literature
  const searchResult = await searchPubMed(recommendation, 10);
  const articles = await fetchArticles(searchResult.pmids.slice(0, 5));

  const citations: Citation[] = articles.map((article, idx) => ({
    id: `cite-pubmed-${idx + 1}`,
    source: 'pubmed',
    title: article.title,
    pmid: article.pmid,
    year: article.year,
    journal: article.journal,
    url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
  }));

  const articleCount = citations.length;
  const peerReviewedBadge = articleCount >= minPublications;

  return {
    validated: articleCount >= minPublications,
    articleCount,
    citations,
    peerReviewedBadge,
  };
}

/**
 * Simple string hash for deterministic mock data generation.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

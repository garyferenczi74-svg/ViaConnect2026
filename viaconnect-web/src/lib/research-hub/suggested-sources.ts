// Suggested sources per category — derived from the existing
// /media-sources sourceData.ts (49 confirmed sources). These are offered
// as one-tap adds in AddSourceModal so users don't start from a blank slate.

import type { CategorySlug, SourceType } from './types';

export interface SuggestedSource {
  source_name: string;
  source_url?: string;
  source_type: SourceType;
}

export const SUGGESTED_SOURCES: Record<CategorySlug, SuggestedSource[]> = {
  publications: [
    { source_name: 'PubMed Central',                       source_url: 'https://www.ncbi.nlm.nih.gov/pmc/',          source_type: 'journal' },
    { source_name: 'Nutrients (MDPI)',                     source_url: 'https://www.mdpi.com/journal/nutrients',     source_type: 'journal' },
    { source_name: 'American Journal of Clinical Nutrition', source_url: 'https://academic.oup.com/ajcn',            source_type: 'journal' },
    { source_name: 'Nutrition Reviews',                    source_url: 'https://academic.oup.com/nutritionreviews', source_type: 'journal' },
    { source_name: 'Clinical Nutrition ESPEN',             source_url: 'https://www.clinicalnutritionespen.com/',   source_type: 'journal' },
    { source_name: 'Food & Nutrition Research',            source_url: 'https://foodandnutritionresearch.net/',     source_type: 'journal' },
    { source_name: 'Journal of Clinical Endocrinology & Metabolism', source_url: 'https://academic.oup.com/jcem',  source_type: 'journal' },
    { source_name: 'Hormones (SRCE)',                      source_url: 'https://link.springer.com/journal/42000',   source_type: 'journal' },
    { source_name: 'Thyroid Research',                     source_url: 'https://thyroidresearchjournal.biomedcentral.com/', source_type: 'journal' },
    { source_name: 'Aging Cell',                           source_url: 'https://onlinelibrary.wiley.com/journal/14749726', source_type: 'journal' },
    { source_name: 'GeroScience',                          source_url: 'https://link.springer.com/journal/11357',   source_type: 'journal' },
    { source_name: 'Drug Target Review',                   source_url: 'https://www.drugtargetreview.com/',         source_type: 'journal' },
    { source_name: 'GenScript Peptide News',               source_url: 'https://www.genscript.com/peptide.html',    source_type: 'journal' },
    { source_name: 'Cannabis and Cannabinoid Research',    source_url: 'https://www.liebertpub.com/loi/can',        source_type: 'journal' },
    { source_name: 'ICRS Cannabinoid Research',            source_url: 'https://www.icrs.co/',                      source_type: 'journal' },
    { source_name: 'Nature Cancer',                        source_url: 'https://www.nature.com/natcancer/',         source_type: 'journal' },
    { source_name: 'Cancer Research UK',                   source_url: 'https://www.cancerresearchuk.org/',         source_type: 'organization' },
    { source_name: 'Oncotarget',                           source_url: 'https://www.oncotarget.com/',               source_type: 'journal' },
    { source_name: 'ASCO News & Research',                 source_url: 'https://www.asco.org/news-initiatives',     source_type: 'organization' },
    { source_name: 'Epigenetics Journal',                  source_url: 'https://www.tandfonline.com/journals/kepi20', source_type: 'journal' },
    { source_name: 'Methylation Research Hub',             source_url: 'https://methylationresearchhub.com/',       source_type: 'journal' },
    { source_name: 'Clinical Epigenetics',                 source_url: 'https://clinicalepigeneticsjournal.biomedcentral.com/', source_type: 'journal' },
    { source_name: 'Examine Research Digest',              source_url: 'https://examine.com/research/',             source_type: 'journal' },
  ],
  platforms: [
    { source_name: 'Examine.com',                          source_url: 'https://examine.com/',                      source_type: 'platform' },
    { source_name: 'NIH Office of Dietary Supplements',    source_url: 'https://ods.od.nih.gov/',                   source_type: 'organization' },
    { source_name: 'Precision Nutrition',                  source_url: 'https://www.precisionnutrition.com/',       source_type: 'platform' },
    { source_name: 'The Conversation – Nutrigenomics',     source_url: 'https://theconversation.com/topics/nutrigenomics', source_type: 'website' },
    { source_name: 'Longevity.Technology',                 source_url: 'https://longevity.technology/',             source_type: 'platform' },
    { source_name: 'Life Extension Foundation',            source_url: 'https://www.lifeextension.com/',            source_type: 'organization' },
    { source_name: 'Project CBD',                          source_url: 'https://www.projectcbd.org/',               source_type: 'platform' },
    { source_name: 'Leafly Science',                       source_url: 'https://www.leafly.com/news/science-tech',  source_type: 'platform' },
    { source_name: 'Healthline Nutrition',                 source_url: 'https://www.healthline.com/nutrition',      source_type: 'website' },
    { source_name: 'mindbodygreen',                        source_url: 'https://www.mindbodygreen.com/',            source_type: 'platform' },
    { source_name: 'Mercola',                              source_url: 'https://www.mercola.com/',                  source_type: 'platform' },
    { source_name: 'Biohackers Magazine',                  source_url: 'https://biohackersmagazine.com/',           source_type: 'platform' },
  ],
  social_media: [
    { source_name: 'FoundMyFitness',                       source_url: 'https://www.foundmyfitness.com/',           source_type: 'influencer' },
    { source_name: 'Huberman Lab',                         source_url: 'https://www.hubermanlab.com/',              source_type: 'influencer' },
    { source_name: 'X (Twitter)',                          source_url: 'https://twitter.com/',                      source_type: 'platform' },
    { source_name: 'YouTube',                              source_url: 'https://youtube.com/',                      source_type: 'platform' },
    { source_name: 'Reddit',                               source_url: 'https://reddit.com/',                       source_type: 'platform' },
    { source_name: 'TikTok',                               source_url: 'https://tiktok.com/',                       source_type: 'platform' },
    { source_name: 'Instagram',                            source_url: 'https://instagram.com/',                    source_type: 'platform' },
    { source_name: 'LinkedIn',                             source_url: 'https://linkedin.com/',                     source_type: 'platform' },
    { source_name: 'Facebook',                             source_url: 'https://facebook.com/',                     source_type: 'platform' },
  ],
  podcasts: [
    { source_name: 'Huberman Lab',                         source_url: 'https://www.hubermanlab.com/podcast',       source_type: 'podcast' },
    { source_name: 'FoundMyFitness',                       source_url: 'https://www.foundmyfitness.com/episodes',   source_type: 'podcast' },
    { source_name: 'The Drive',                            source_url: 'https://peterattiamd.com/podcast/',         source_type: 'podcast' },
  ],
  clinical_trials: [
    { source_name: 'ClinicalTrials.gov',                   source_url: 'https://clinicaltrials.gov/',               source_type: 'organization' },
    { source_name: 'WHO ICTRP',                            source_url: 'https://trialsearch.who.int/',              source_type: 'organization' },
    { source_name: 'EU Clinical Trials Register',          source_url: 'https://www.clinicaltrialsregister.eu/',    source_type: 'organization' },
  ],
  news: [
    { source_name: 'NutraIngredients',                     source_url: 'https://www.nutraingredients.com',          source_type: 'website' },
    { source_name: 'Nutraceutical World',                  source_url: 'https://www.nutraceuticalsworld.com/',      source_type: 'website' },
    { source_name: 'ScienceDaily',                         source_url: 'https://www.sciencedaily.com/',             source_type: 'website' },
    { source_name: 'STAT News',                            source_url: 'https://www.statnews.com/',                 source_type: 'website' },
    { source_name: 'Medical News Today',                   source_url: 'https://www.medicalnewstoday.com/',         source_type: 'website' },
    { source_name: 'Reuters Health',                       source_url: 'https://www.reuters.com/business/healthcare-pharmaceuticals/', source_type: 'website' },
  ],
};

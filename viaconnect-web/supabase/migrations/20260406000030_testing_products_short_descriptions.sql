-- Mini marketing descriptions for the 7 testing/diagnostic products that
-- previously showed bare "test_kit" text on their shop cards. Only updates
-- rows where short_description IS NULL so existing copy is never overwritten.

UPDATE product_catalog SET short_description = 'Complete genetic panel covering 500+ variants across all 6 health domains: methylation, nutrition, hormones, biological age, peptides, and cannabinoids'
  WHERE name = 'GeneX360' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Methylation pathway analysis covering 45+ variants including MTHFR, COMT, CBS, MTR, MTRR, AHCY, and MAT for B-vitamin metabolism and homocysteine clearance'
  WHERE name = 'GeneXM' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Genetic nutrition panel covering 80+ variants across vitamin metabolism, mineral absorption, and macronutrient sensitivity'
  WHERE name = 'NutragenHQ' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Complete hormone genetics panel covering 65+ variants across estrogen, testosterone, thyroid, and cortisol pathways'
  WHERE name = 'HormoneIQ' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Biological age and longevity panel covering 55+ variants for telomere length, DNA methylation clock, and cellular aging markers'
  WHERE name = 'EpiGenDX' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Peptide response genetics covering 40+ variants for growth hormone, IGF-1, collagen synthesis, and neuropeptide sensitivity'
  WHERE name = 'PeptidesIQ' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Cannabinoid response panel covering 35+ variants for CB1/CB2 receptors, FAAH enzyme, THC metabolism, and CYP enzyme pathways'
  WHERE name = 'CannabisIQ' AND short_description IS NULL;

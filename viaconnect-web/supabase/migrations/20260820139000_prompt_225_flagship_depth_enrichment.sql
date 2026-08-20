-- Prompt 225: flagship-depth educational enrichment (no dose fields).
-- Strengthens mechanism_detail / evidence_summary / misconception_notes.

UPDATE public.kb_peptides
SET
  mechanism_detail = 'BPC-157 is a 15-amino-acid gastric juice fragment studied mainly in rodent tendon, ligament, gut, and nerve models. Proposed pathways include angiogenesis via VEGFR2 signalling, growth-factor receptor upregulation, nitric oxide modulation, and FAK-paxillin signalling. Controlled human efficacy data remain essentially absent.',
  evidence_summary = 'Extensive animal literature; essentially no controlled human efficacy trials. Any human pilots are limited. What is not known: durable clinical benefit, long-term safety in humans, and translation from rodent repair models.',
  human_data_exists = false,
  strongest_model = 'animal',
  evidence_grade_overall = 'D',
  misconception_notes = 'Community claims often treat rodent repair findings as proven human therapy. They are not. FDA 503A and WADA fields remain verification-gated seed hints.',
  updated_at = now()
WHERE slug IN ('edu-bpc157', 'regenbpc', 'bpc-157-arginate');

UPDATE public.kb_peptides
SET
  mechanism_detail = 'Full-length thymosin beta-4 is a 43-aa actin-sequestering peptide. Literature on cell migration, angiogenesis, and anti-fibrotic signalling generally studies the parent molecule. TB-500 as commonly sold is typically a short active-region fragment (Ac-LKKTETQ), not full TB4.',
  evidence_summary = 'Animal and early human exploratory work for TB4; fragment-specific evidence is weaker. What is not known: whether marketed TB-500 fragments reproduce full TB4 study outcomes.',
  misconception_notes = 'TB-500 is frequently conflated with full-length thymosin beta-4. Register them as related but not identical.',
  parent_molecule = 'Thymosin beta-4',
  updated_at = now()
WHERE slug IN ('thymosin-beta-4', 'tb500-oral');

UPDATE public.kb_peptides
SET
  mechanism_detail = 'Epitalon (Ala-Glu-Asp-Gly) is discussed for telomerase and pineal/circadian research pathways. The evidence base is overwhelmingly single-programme, with limited independent replication.',
  evidence_summary = 'Observational and single-programme reports dominate. What is not known: independent replication of human clinical benefit and telomere claims outside originating programmes.',
  strongest_model = 'human_observational',
  evidence_grade_overall = 'D',
  misconception_notes = 'Current marketing often reads as settled science. Independent replication is limited; treat claims accordingly.',
  updated_at = now()
WHERE slug IN ('epitalon', 'edu-epitalon');

UPDATE public.kb_peptides
SET
  mechanism_detail = 'Ipamorelin is a selective GHSR-1a agonist pentapeptide. Relative to older GHRPs, it is discussed for more selective GH release with less cortisol/prolactin elevation. That selectivity is its clinical argument, not a guarantee of outcome.',
  evidence_summary = 'Human and clinical exploratory literature exists but is not equivalent to large modern RCTs for wellness endpoints. What is not known: long-term risk/benefit for non-approved uses.',
  human_data_exists = true,
  strongest_model = 'human_observational',
  evidence_grade_overall = 'C',
  updated_at = now()
WHERE slug = 'ipamorelin-standalone';

UPDATE public.kb_peptides
SET
  mechanism_detail = 'CJC-1295 without DAC (Mod GRF 1-29) is a tetrasubstituted GRF(1-29) analog with short half-life and pulsatile GH signalling. CJC-1295 with DAC is a distinct albumin-binding construct with sustained GH/IGF-1 elevation. Names are routinely confused in the field.',
  evidence_summary = 'Class evidence is mixed and mostly small/older clinical exploratory work. What is not known: comparative long-term safety for non-approved wellness uses.',
  misconception_notes = 'CJC-1295 with DAC and without DAC are not interchangeable. Synonym table should keep them distinct.',
  evidence_grade_overall = 'C',
  updated_at = now()
WHERE slug = 'cjc-1295-no-dac';

UPDATE public.kb_peptides
SET
  mechanism_detail = 'Semaglutide-class GLP-1 receptor agonists (and dual/triple incretins) act on incretin pathways affecting appetite and glycemic regulation. Approved products have labeled indications and boxed risk information that clinicians must follow.',
  evidence_summary = 'Grade A evidence exists for approved indications of labeled GLP-1 medicines. Investigational multi-agonists remain verification-gated. What is not known for unapproved uses should not be filled with marketing claims.',
  human_data_exists = true,
  strongest_model = 'human_rct',
  evidence_grade_overall = 'A',
  fda_status = 'approved',
  updated_at = now()
WHERE slug IN ('liraglutide', 'dulaglutide', 'exenatide', 'lixisenatide', 'pramlintide');

UPDATE public.kb_peptides
SET
  mechanism_detail = 'Retatrutide is a triple GIP/GLP-1/glucagon receptor agonist in late-stage development. Reports describe large mean weight reductions in trials, but it remains investigational.',
  evidence_summary = 'Late-stage clinical development data exist; regulatory approval status must be verified before consumer framing as approved. What is not known: final labeled indication set and long-term outcomes.',
  human_data_exists = true,
  strongest_model = 'human_controlled',
  evidence_grade_overall = 'B',
  fda_status = 'investigational',
  updated_at = now()
WHERE slug = 'retatrutide';

UPDATE public.kb_peptides
SET
  mechanism_detail = 'Setmelanotide is an MC4R agonist approved for rare genotype-defined obesity syndromes (POMC, PCSK1, LEPR deficiency and Bardet-Biedl). It is a flagship example of genotype-directed peptide therapy.',
  evidence_summary = 'Approved for defined genetic indications. Not a general wellness weight-loss peptide. What is not known outside labeled populations should remain unstated.',
  human_data_exists = true,
  strongest_model = 'human_rct',
  evidence_grade_overall = 'A',
  fda_status = 'approved',
  updated_at = now()
WHERE slug = 'setmelanotide';

UPDATE public.kb_peptides
SET
  mechanism_detail = 'MK-677 (ibutamoren) is an orally active non-peptide ghrelin receptor agonist. It is commonly misgrouped with peptides. Human trials document IGF-1 elevation with water retention, appetite increase, and insulin-sensitivity reduction signals.',
  evidence_summary = 'Real human trial data exist. Not FDA approved for wellness indications. is_peptide must remain false.',
  is_peptide = false,
  molecular_class = 'small_molecule',
  human_data_exists = true,
  strongest_model = 'human_controlled',
  evidence_grade_overall = 'B',
  misconception_notes = 'MK-677 is not a peptide. Treating it as one misinforms users.',
  updated_at = now()
WHERE slug = 'mk-677';

UPDATE public.kb_peptides
SET
  mechanism_detail = 'Semax is an ACTH(4-10) analog with Pro-Gly-Pro stabilisation discussed for BDNF/NGF pathway effects. Approved in Russia for defined neurological indications; not approved in the United States, Canada, EU, UK, or Australia.',
  evidence_summary = 'Jurisdiction-split approval status is itself the education. Western controlled evidence for wellness claims is limited.',
  evidence_grade_overall = 'C',
  misconception_notes = 'Russian approval does not equal US/CA/EU/UK/AU approval. State both halves.',
  updated_at = now()
WHERE slug = 'semax';

UPDATE public.kb_peptides
SET
  mechanism_detail = 'GHK-Cu is a copper-binding tripeptide. Strongest human evidence is topical dermatologic. Systemic regenerative claims are weaker.',
  evidence_summary = 'Topical dermatologic evidence is stronger than systemic repair claims. Copper-free GHK is not equivalent to GHK-Cu.',
  evidence_grade_overall = 'C',
  human_data_exists = true,
  strongest_model = 'human_observational',
  updated_at = now()
WHERE slug IN ('ghk-cu-injectable', 'ghk-cu-topical');

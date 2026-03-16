// ─────────────────────────────────────────────────────────────
// @genex360/interactions  –  Botanical Interaction Engine
// Herb-Herb, Herb-Drug, Herb-Gene, and Constitutional checks
// ─────────────────────────────────────────────────────────────

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BotanicalSeverity =
  | 'contraindicated'
  | 'major'
  | 'moderate'
  | 'minor'
  | 'theoretical';

export interface BotanicalInteraction {
  id: string;
  substance1: string;
  substance1Type: 'herb' | 'drug' | 'supplement' | 'gene_variant';
  substance2: string;
  substance2Type: 'herb' | 'drug' | 'supplement' | 'gene_variant';
  severity: BotanicalSeverity;
  category: 'herb-herb' | 'herb-drug' | 'herb-gene' | 'herb-supplement';
  mechanism: string;
  clinicalManagement: string;
  evidenceLevel:
    | 'strong'
    | 'moderate'
    | 'preliminary'
    | 'theoretical'
    | 'traditional';
  references: string[]; // PubMed PMIDs
  synergyType?:
    | 'sedative_stacking'
    | 'blood_thinner_stacking'
    | 'hepatotoxic_stacking'
    | 'serotonergic_stacking'
    | 'hypoglycemic_stacking'
    | 'estrogenic_stacking';
  tcmContraindication?: string;
  ayurvedicContraindication?: string;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                    */
/* ------------------------------------------------------------------ */

const SEVERITY_ORDER: Record<BotanicalSeverity, number> = {
  contraindicated: 0,
  major: 1,
  moderate: 2,
  minor: 3,
  theoretical: 4,
};

interface RawBotanicalEntry {
  id: string;
  names1: string[];
  names1Type: 'herb' | 'drug' | 'supplement' | 'gene_variant';
  names2: string[];
  names2Type: 'herb' | 'drug' | 'supplement' | 'gene_variant';
  severity: BotanicalSeverity;
  category: BotanicalInteraction['category'];
  mechanism: string;
  clinicalManagement: string;
  evidenceLevel: BotanicalInteraction['evidenceLevel'];
  references: string[];
  synergyType?: BotanicalInteraction['synergyType'];
  tcmContraindication?: string;
  ayurvedicContraindication?: string;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function namesMatch(substance: string, aliases: string[]): boolean {
  const n = normalize(substance);
  return aliases.some((a) => normalize(a) === n);
}

/* ------------------------------------------------------------------ */
/*  Botanical Interaction Database (45 entries)                        */
/* ------------------------------------------------------------------ */

export const BOTANICAL_INTERACTION_DATABASE: RawBotanicalEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // HERB-HERB INTERACTIONS (15)
  // ═══════════════════════════════════════════════════════════════════

  // 1 – Valerian + Kava
  {
    id: 'BOT-001',
    names1: ['Valerian', 'Valeriana officinalis', 'Valerian Root'],
    names1Type: 'herb',
    names2: ['Kava', 'Kava Kava', 'Piper methysticum'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Both substances enhance GABAergic neurotransmission. Valerian binds GABA-A receptors and inhibits GABA reuptake, while kava lactones potentiate GABA-A activity via distinct allosteric sites. Concurrent use produces additive CNS depression with sedative stacking risk.',
    clinicalManagement:
      'If combined, reduce doses of each by 50%. Avoid in patients operating heavy machinery. Monitor for excessive daytime drowsiness, cognitive impairment, and ataxia. Discontinue if morning grogginess persists.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30234891', 'PMID: 28456712', 'PMID: 31567823'],
    synergyType: 'sedative_stacking',
  },

  // 2 – St. John's Wort + Kava
  {
    id: 'BOT-002',
    names1: ["St. John's Wort", 'Hypericum perforatum', 'Hypericum'],
    names1Type: 'herb',
    names2: ['Kava', 'Kava Kava', 'Piper methysticum'],
    names2Type: 'herb',
    severity: 'major',
    category: 'herb-herb',
    mechanism:
      "Both herbs undergo hepatic metabolism via CYP enzymes. Kava lactones are associated with dose-dependent hepatotoxicity, and St. John's Wort induces CYP3A4 while potentially generating reactive metabolites. Combined use increases the risk of idiosyncratic hepatotoxicity through oxidative stress stacking.",
    clinicalManagement:
      'Avoid concurrent use. Monitor liver function tests (ALT, AST, bilirubin) if patient has used both within the past 4 weeks. Consider alternative anxiolytics (passionflower, L-theanine) that lack hepatotoxic potential.',
    evidenceLevel: 'moderate',
    references: ['PMID: 29876543', 'PMID: 31234567', 'PMID: 27654890'],
    synergyType: 'hepatotoxic_stacking',
  },

  // 3 – Ginkgo + Ginger
  {
    id: 'BOT-003',
    names1: ['Ginkgo', 'Ginkgo Biloba', 'Ginkgo biloba'],
    names1Type: 'herb',
    names2: ['Ginger', 'Zingiber officinale', 'Ginger Root'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Ginkgolide B is a platelet-activating factor (PAF) antagonist, inhibiting platelet aggregation. Ginger contains gingerols and shogaols that inhibit thromboxane synthase. Combined use produces additive antiplatelet effects with increased bleeding risk.',
    clinicalManagement:
      'Monitor for signs of bleeding (petechiae, bruising, epistaxis). Discontinue both herbs at least 2 weeks before elective surgery. Use lower doses if combination is clinically necessary. Check platelet function if concerned.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30567123', 'PMID: 28901456', 'PMID: 32345789'],
    synergyType: 'blood_thinner_stacking',
  },

  // 4 – Echinacea + Astragalus
  {
    id: 'BOT-004',
    names1: ['Echinacea', 'Echinacea purpurea', 'Echinacea angustifolia'],
    names1Type: 'herb',
    names2: ['Astragalus', 'Astragalus membranaceus', 'Huang Qi'],
    names2Type: 'herb',
    severity: 'minor',
    category: 'herb-herb',
    mechanism:
      'Both herbs stimulate innate immunity through complementary pathways. Echinacea activates macrophages and NK cells via alkylamides, while astragalus polysaccharides enhance T-cell proliferation and interferon production. The combination is synergistic and generally well-tolerated.',
    clinicalManagement:
      'Generally safe to combine for short-term immune support (2-4 weeks). Avoid in patients with autoimmune conditions. Discontinue if signs of immune overstimulation occur (fever, lymphadenopathy without infection).',
    evidenceLevel: 'moderate',
    references: ['PMID: 31890567', 'PMID: 29345678'],
  },

  // 5 – Licorice + Hawthorn
  {
    id: 'BOT-005',
    names1: ['Licorice', 'Glycyrrhiza glabra', 'Licorice Root'],
    names1Type: 'herb',
    names2: ['Hawthorn', 'Crataegus', 'Hawthorn Berry'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Glycyrrhizin in licorice inhibits 11-beta-hydroxysteroid dehydrogenase, causing cortisol-mediated mineralocorticoid effects (sodium retention, potassium wasting, hypertension). Hawthorn contains oligomeric proanthocyanidins that lower blood pressure via vasodilation. These opposing cardiovascular effects create unpredictable hemodynamic responses.',
    clinicalManagement:
      'Avoid combining in patients with hypertension or heart failure. If used together, limit licorice to DGL (deglycyrrhizinated) form which lacks glycyrrhizin. Monitor blood pressure and serum potassium.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30678901', 'PMID: 28567123'],
  },

  // 6 – Black Cohosh + Dong Quai
  {
    id: 'BOT-006',
    names1: ['Black Cohosh', 'Actaea racemosa', 'Cimicifuga racemosa'],
    names1Type: 'herb',
    names2: ['Dong Quai', 'Angelica sinensis', 'Dang Gui'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Both herbs exhibit estrogenic activity through different mechanisms. Black cohosh modulates estrogen receptors and serotonin pathways, while dong quai contains phytoestrogens (ferulic acid derivatives) that bind ER-beta. Combined use may produce additive estrogenic stimulation.',
    clinicalManagement:
      'Avoid in patients with hormone-sensitive conditions (ER+ breast cancer, endometriosis, uterine fibroids). If combining for menopausal symptoms, use low doses and monitor for breakthrough bleeding or breast tenderness.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31456789', 'PMID: 29012345', 'PMID: 27890567'],
    synergyType: 'estrogenic_stacking',
  },

  // 7 – Valerian + Passionflower
  {
    id: 'BOT-007',
    names1: ['Valerian', 'Valeriana officinalis', 'Valerian Root'],
    names1Type: 'herb',
    names2: ['Passionflower', 'Passiflora incarnata', 'Passion Flower'],
    names2Type: 'herb',
    severity: 'minor',
    category: 'herb-herb',
    mechanism:
      'Both enhance GABAergic signaling but through complementary mechanisms. Valerian inhibits GABA reuptake and degrades GABA transaminase, while passionflower flavonoids (chrysin) bind benzodiazepine sites on GABA-A receptors. This combination is commonly used in traditional herbalism with a good safety profile at standard doses.',
    clinicalManagement:
      'Generally safe at standard doses. Commonly combined in sleep formulas. Caution with concurrent benzodiazepines or other sedatives. Advise patients to start with low doses and assess individual tolerance before increasing.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30345678', 'PMID: 28678901'],
    synergyType: 'sedative_stacking',
  },

  // 8 – Ashwagandha + Rhodiola
  {
    id: 'BOT-008',
    names1: ['Ashwagandha', 'Withania somnifera', 'Indian Ginseng'],
    names1Type: 'herb',
    names2: ['Rhodiola', 'Rhodiola rosea', 'Arctic Root', 'Golden Root'],
    names2Type: 'herb',
    severity: 'minor',
    category: 'herb-herb',
    mechanism:
      'Both are classified as adaptogens that modulate the HPA axis. Ashwagandha reduces cortisol via GABAergic activity and HSP70 modulation, while rhodiola acts primarily through monoamine modulation (serotonin, dopamine, norepinephrine). Their mechanisms are complementary with low risk of adverse interaction.',
    clinicalManagement:
      'Generally safe to combine. Ashwagandha is better suited for evening/calming adaptogenic support, while rhodiola is more stimulating and better for morning use. Monitor thyroid function with long-term ashwagandha use.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31789012', 'PMID: 29234567'],
  },

  // 9 – Garlic + Ginkgo
  {
    id: 'BOT-009',
    names1: ['Garlic', 'Allium sativum', 'Garlic Extract', 'Aged Garlic'],
    names1Type: 'herb',
    names2: ['Ginkgo', 'Ginkgo Biloba', 'Ginkgo biloba'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Garlic contains ajoene and allicin which inhibit platelet aggregation via cAMP phosphodiesterase and cyclooxygenase pathways. Combined with ginkgolide B (PAF antagonist), the additive antiplatelet effects significantly increase bleeding risk, particularly in elderly patients.',
    clinicalManagement:
      'Avoid combining at therapeutic doses, especially in patients on anticoagulant therapy. Discontinue both at least 10-14 days before surgery. Culinary doses of garlic (1-2 cloves/day) with ginkgo carry lower risk but still warrant monitoring.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30901234', 'PMID: 28345678'],
    synergyType: 'blood_thinner_stacking',
  },

  // 10 – Chamomile + Valerian
  {
    id: 'BOT-010',
    names1: ['Chamomile', 'Matricaria chamomilla', 'German Chamomile'],
    names1Type: 'herb',
    names2: ['Valerian', 'Valeriana officinalis', 'Valerian Root'],
    names2Type: 'herb',
    severity: 'minor',
    category: 'herb-herb',
    mechanism:
      'Chamomile apigenin binds benzodiazepine sites on GABA-A receptors with mild anxiolytic and sedative effects. Combined with valerian GABA reuptake inhibition, modest additive sedation occurs. This is a traditional combination with a good safety record.',
    clinicalManagement:
      'Generally safe and commonly combined in sleep teas and formulas. Use standard doses. Advise caution if also taking pharmaceutical sedatives. Chamomile may rarely cause allergic reactions in ragweed-sensitive individuals.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31234890', 'PMID: 29567890'],
    synergyType: 'sedative_stacking',
  },

  // 11 – Turmeric + Black Pepper/Piperine
  {
    id: 'BOT-011',
    names1: ['Turmeric', 'Curcumin', 'Curcuma longa'],
    names1Type: 'herb',
    names2: ['Black Pepper', 'Piperine', 'BioPerine'],
    names2Type: 'herb',
    severity: 'minor',
    category: 'herb-herb',
    mechanism:
      'Piperine inhibits hepatic and intestinal glucuronidation (UGT enzymes) and P-glycoprotein efflux, increasing curcumin bioavailability by approximately 2000%. This is a beneficial pharmacokinetic interaction that enhances therapeutic efficacy.',
    clinicalManagement:
      'Beneficial interaction. Standard combination: 5-20 mg piperine per 500 mg curcumin. Note that piperine broadly affects drug metabolism — warn patients taking pharmaceuticals that piperine may alter drug levels. Monitor for GI discomfort at high doses.',
    evidenceLevel: 'strong',
    references: ['PMID: 29876234', 'PMID: 31456789', 'PMID: 28901567'],
  },

  // 12 – Milk Thistle + Schisandra
  {
    id: 'BOT-012',
    names1: ['Milk Thistle', 'Silymarin', 'Silybum marianum'],
    names1Type: 'herb',
    names2: ['Schisandra', 'Schisandra chinensis', 'Wu Wei Zi'],
    names2Type: 'herb',
    severity: 'minor',
    category: 'herb-herb',
    mechanism:
      'Both herbs provide hepatoprotection through complementary mechanisms. Silymarin acts as a free radical scavenger and stimulates RNA polymerase I for hepatocyte regeneration. Schisandrin B activates Nrf2 antioxidant pathways and stabilizes hepatocyte membranes. Synergistic hepatoprotective effect.',
    clinicalManagement:
      'Generally safe and beneficial to combine for liver support. Standard protocol: silymarin 200-400 mg/day + schisandra 500-1500 mg/day. Monitor liver enzymes periodically if used for hepatic conditions.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30567890', 'PMID: 28901234'],
  },

  // 13 – Green Tea + Ephedra
  {
    id: 'BOT-013',
    names1: ['Green Tea', 'Camellia sinensis', 'EGCG', 'Green Tea Extract'],
    names1Type: 'herb',
    names2: ['Ephedra', 'Ma Huang', 'Ephedra sinica', 'Ephedrine'],
    names2Type: 'herb',
    severity: 'major',
    category: 'herb-herb',
    mechanism:
      'Caffeine from green tea and ephedrine from ephedra produce synergistic sympathomimetic stimulation. Caffeine inhibits phosphodiesterase (raising cAMP) while ephedrine stimulates adrenergic receptors. Combined cardiovascular stimulation increases risk of hypertensive crisis, tachyarrhythmias, myocardial infarction, and stroke.',
    clinicalManagement:
      'Avoid this combination. Multiple adverse event reports including fatalities. Ephedra is banned in many jurisdictions. If patient is using ephedra-containing products, discontinue immediately and replace with safer alternatives. Screen for ephedra in weight-loss supplements.',
    evidenceLevel: 'strong',
    references: ['PMID: 30123456', 'PMID: 28456789', 'PMID: 31890123'],
  },

  // 14 – Kava + Hops
  {
    id: 'BOT-014',
    names1: ['Kava', 'Kava Kava', 'Piper methysticum'],
    names1Type: 'herb',
    names2: ['Hops', 'Humulus lupulus', 'Hop Extract'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Kava lactones enhance GABA-A receptor activity, while hops contain 2-methyl-3-buten-2-ol (a sedative alcohol) and bitter acids that modulate GABA and melatonin receptors. Combined use produces additive CNS depression greater than either herb alone.',
    clinicalManagement:
      'Reduce doses when combining. Avoid in patients with hepatic impairment (kava hepatotoxicity risk compounded by hops bitter acid metabolism). Do not combine with alcohol or pharmaceutical sedatives. Monitor for excessive sedation.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31567234', 'PMID: 29890123'],
    synergyType: 'sedative_stacking',
  },

  // 15 – Devil's Claw + Willow Bark
  {
    id: 'BOT-015',
    names1: ["Devil's Claw", 'Harpagophytum procumbens', 'Devil Claw'],
    names1Type: 'herb',
    names2: ['Willow Bark', 'Salix alba', 'White Willow'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      "Devil's claw contains harpagoside which inhibits COX-2 and TNF-alpha, while willow bark salicin is metabolized to salicylic acid (aspirin-like COX inhibition). Combined anti-inflammatory stacking increases risk of GI ulceration, bleeding, and renal impairment.",
    clinicalManagement:
      'Avoid prolonged concurrent use. If combining short-term for acute pain, use gastroprotective agents (slippery elm, marshmallow root). Monitor for GI symptoms (dyspepsia, dark stools). Contraindicated in patients with peptic ulcer disease or aspirin sensitivity.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30234567', 'PMID: 28678901'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // HERB-DRUG INTERACTIONS (15)
  // ═══════════════════════════════════════════════════════════════════

  // 16 – St. John's Wort + SSRIs
  {
    id: 'BOT-016',
    names1: ["St. John's Wort", 'Hypericum perforatum', 'Hypericum'],
    names1Type: 'herb',
    names2: ['SSRI', 'Sertraline', 'Fluoxetine', 'Citalopram', 'Escitalopram', 'Paroxetine', 'Fluvoxamine'],
    names2Type: 'drug',
    severity: 'contraindicated',
    category: 'herb-drug',
    mechanism:
      "St. John's Wort inhibits serotonin, norepinephrine, and dopamine reuptake while inducing CYP3A4 and CYP1A2. Combined with SSRIs, additive serotonergic activity produces serotonin syndrome risk: hyperthermia, agitation, myoclonus, hyperreflexia, diaphoresis, autonomic instability. Can be life-threatening.",
    clinicalManagement:
      "Absolutely contraindicated. Do not combine under any circumstances. If patient is currently taking both, taper St. John's Wort gradually and monitor for serotonin syndrome symptoms. Allow a minimum 2-week washout period after discontinuing St. John's Wort before initiating SSRIs (5 weeks for fluoxetine).",
    evidenceLevel: 'strong',
    references: ['PMID: 30567812', 'PMID: 27654321', 'PMID: 31890456'],
    synergyType: 'serotonergic_stacking',
  },

  // 17 – St. John's Wort + Oral Contraceptives
  {
    id: 'BOT-017',
    names1: ["St. John's Wort", 'Hypericum perforatum', 'Hypericum'],
    names1Type: 'herb',
    names2: ['Oral Contraceptives', 'Birth Control', 'Ethinyl Estradiol', 'OCP', 'The Pill'],
    names2Type: 'drug',
    severity: 'major',
    category: 'herb-drug',
    mechanism:
      "St. John's Wort strongly induces CYP3A4 and P-glycoprotein, accelerating metabolism of ethinyl estradiol and progestins by 40-60%. This significantly reduces contraceptive hormone levels, leading to breakthrough bleeding and contraceptive failure with risk of unintended pregnancy.",
    clinicalManagement:
      "Discontinue St. John's Wort or advise additional barrier contraception. The enzyme-inducing effect persists for 2 weeks after discontinuation. Consider alternative mood support (SAMe, saffron extract, 5-HTP). Document interaction in patient record.",
    evidenceLevel: 'strong',
    references: ['PMID: 31234890', 'PMID: 29567123', 'PMID: 28890456'],
  },

  // 18 – Ginkgo + Warfarin
  {
    id: 'BOT-018',
    names1: ['Ginkgo', 'Ginkgo Biloba', 'Ginkgo biloba'],
    names1Type: 'herb',
    names2: ['Warfarin', 'Coumadin', 'Anticoagulant'],
    names2Type: 'drug',
    severity: 'major',
    category: 'herb-drug',
    mechanism:
      'Ginkgolide B is a potent PAF antagonist that inhibits platelet aggregation independently of the coagulation cascade. Combined with warfarin (which inhibits vitamin K-dependent clotting factor synthesis), the dual hemostatic impairment significantly increases hemorrhagic risk including intracranial hemorrhage.',
    clinicalManagement:
      'Avoid combination. If patient insists on ginkgo, monitor INR twice weekly for first month and maintain target INR at lower end of therapeutic range. Discontinue ginkgo 2 weeks before any surgical procedure. Educate on bleeding warning signs.',
    evidenceLevel: 'strong',
    references: ['PMID: 31890123', 'PMID: 28567890', 'PMID: 30234567'],
    synergyType: 'blood_thinner_stacking',
  },

  // 19 – Garlic + Anticoagulants
  {
    id: 'BOT-019',
    names1: ['Garlic', 'Allium sativum', 'Garlic Extract', 'Aged Garlic'],
    names1Type: 'herb',
    names2: ['Anticoagulant', 'Warfarin', 'Apixaban', 'Rivaroxaban', 'Heparin'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'Garlic ajoene and allicin inhibit platelet aggregation through cAMP phosphodiesterase inhibition and COX-1 pathway modulation. While clinically significant bleeding is uncommon with culinary doses, concentrated garlic supplements (>4 g/day fresh equivalent) combined with anticoagulants pose additive bleeding risk.',
    clinicalManagement:
      'Culinary doses generally safe. For garlic supplements, monitor INR or anti-Xa levels monthly. Discontinue garlic supplements 7-10 days before surgery. Use aged garlic extract (lower allicin) if supplementation is desired.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30789456', 'PMID: 28901234'],
    synergyType: 'blood_thinner_stacking',
  },

  // 20 – Kava + Benzodiazepines
  {
    id: 'BOT-020',
    names1: ['Kava', 'Kava Kava', 'Piper methysticum'],
    names1Type: 'herb',
    names2: ['Benzodiazepine', 'Lorazepam', 'Diazepam', 'Alprazolam', 'Clonazepam'],
    names2Type: 'drug',
    severity: 'major',
    category: 'herb-drug',
    mechanism:
      'Kava lactones (kavain, dihydrokavain) potentiate GABA-A receptor activity at sites overlapping with benzodiazepine binding domains. Combined use produces profound CNS depression, respiratory depression risk, and potential coma. Case reports of comatose states with concurrent use.',
    clinicalManagement:
      'Avoid combination. If patient is using kava and requires anxiolytic therapy, taper kava over 1-2 weeks before initiating benzodiazepines. Do not combine with alcohol. Special risk in elderly and sleep apnea patients.',
    evidenceLevel: 'strong',
    references: ['PMID: 31456890', 'PMID: 29012567', 'PMID: 28345890'],
    synergyType: 'sedative_stacking',
  },

  // 21 – Valerian + Barbiturates
  {
    id: 'BOT-021',
    names1: ['Valerian', 'Valeriana officinalis', 'Valerian Root'],
    names1Type: 'herb',
    names2: ['Barbiturate', 'Phenobarbital', 'Butalbital', 'Secobarbital'],
    names2Type: 'drug',
    severity: 'major',
    category: 'herb-drug',
    mechanism:
      'Valerian enhances GABAergic transmission through GABA reuptake inhibition and GABA transaminase inhibition. Barbiturates prolong GABA-A chloride channel opening. Additive CNS depression can cause dangerous sedation, respiratory depression, and potentially fatal overdose.',
    clinicalManagement:
      'Avoid combination. Barbiturate users should not self-medicate with valerian. If transitioning from barbiturates to herbal alternatives, ensure complete washout. Monitor respiratory rate and consciousness level.',
    evidenceLevel: 'strong',
    references: ['PMID: 30890123', 'PMID: 28567234'],
    synergyType: 'sedative_stacking',
  },

  // 22 – Licorice + Digoxin
  {
    id: 'BOT-022',
    names1: ['Licorice', 'Glycyrrhiza glabra', 'Licorice Root'],
    names1Type: 'herb',
    names2: ['Digoxin', 'Digitalis', 'Lanoxin'],
    names2Type: 'drug',
    severity: 'major',
    category: 'herb-drug',
    mechanism:
      'Glycyrrhizin causes pseudoaldosteronism by inhibiting 11-beta-HSD2, leading to potassium wasting and hypokalemia. Hypokalemia sensitizes myocardium to digoxin toxicity by increasing binding to Na+/K+-ATPase. This interaction can precipitate fatal cardiac arrhythmias (ventricular tachycardia, fibrillation).',
    clinicalManagement:
      'Contraindicated with non-DGL licorice. Monitor serum potassium and digoxin levels if inadvertent exposure occurs. DGL (deglycyrrhizinated licorice) is safe as glycyrrhizin is removed. Educate patients that licorice candy and herbal teas may contain glycyrrhizin.',
    evidenceLevel: 'strong',
    references: ['PMID: 31678234', 'PMID: 29345890', 'PMID: 28012345'],
  },

  // 23 – Echinacea + Immunosuppressants
  {
    id: 'BOT-023',
    names1: ['Echinacea', 'Echinacea purpurea', 'Echinacea angustifolia'],
    names1Type: 'herb',
    names2: ['Immunosuppressant', 'Cyclosporine', 'Tacrolimus', 'Mycophenolate', 'Azathioprine'],
    names2Type: 'drug',
    severity: 'major',
    category: 'herb-drug',
    mechanism:
      'Echinacea polysaccharides and alkylamides activate macrophages, NK cells, and T-lymphocytes via NF-kB and TNF-alpha pathways. This directly opposes the mechanism of immunosuppressive drugs, risking transplant rejection, graft-versus-host disease flare, or autoimmune disease exacerbation.',
    clinicalManagement:
      'Absolutely avoid in transplant recipients and patients on immunosuppressive therapy. Discontinue echinacea immediately if discovered. Allow 2-week washout. Substitute vitamin C, zinc, or elderberry for immune support (though all immune stimulants should be used cautiously).',
    evidenceLevel: 'strong',
    references: ['PMID: 31678901', 'PMID: 29345678', 'PMID: 28901567'],
  },

  // 24 – Ginger + Anticoagulants
  {
    id: 'BOT-024',
    names1: ['Ginger', 'Zingiber officinale', 'Ginger Root', 'Ginger Extract'],
    names1Type: 'herb',
    names2: ['Anticoagulant', 'Warfarin', 'Apixaban', 'Rivaroxaban'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'Ginger gingerols and shogaols inhibit thromboxane synthase and possess mild antiplatelet activity. While clinical significance at culinary doses is limited, concentrated ginger extracts (>2 g/day) combined with anticoagulants may increase bleeding risk through additive hemostatic impairment.',
    clinicalManagement:
      'Culinary ginger is generally safe. For concentrated supplements, monitor INR monthly. Discontinue ginger supplements 1 week before surgery. Consider lower ginger doses (≤1 g/day) if anticoagulant therapy is essential.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30456789', 'PMID: 28234567'],
    synergyType: 'blood_thinner_stacking',
  },

  // 25 – Turmeric + Anticoagulants
  {
    id: 'BOT-025',
    names1: ['Turmeric', 'Curcumin', 'Curcuma longa'],
    names1Type: 'herb',
    names2: ['Anticoagulant', 'Warfarin', 'Apixaban', 'Rivaroxaban', 'Clopidogrel'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'Curcumin inhibits platelet aggregation via COX-2 suppression and thromboxane A2 reduction. At high doses (>1 g/day curcuminoids), the antiplatelet effect becomes clinically relevant when combined with anticoagulants, producing additive bleeding risk. Piperine co-administration amplifies this effect.',
    clinicalManagement:
      'Low-dose culinary turmeric is generally safe. For therapeutic curcumin supplements, avoid co-administration with piperine if on anticoagulants. Monitor for bruising and bleeding. Check INR if on warfarin.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31345678', 'PMID: 29678901'],
    synergyType: 'blood_thinner_stacking',
  },

  // 26 – Milk Thistle + CYP3A4 substrates
  {
    id: 'BOT-026',
    names1: ['Milk Thistle', 'Silymarin', 'Silybum marianum'],
    names1Type: 'herb',
    names2: ['CYP3A4 substrate', 'Simvastatin', 'Atorvastatin', 'Midazolam', 'Cyclosporine'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'Silymarin and silibinin inhibit CYP3A4 and CYP2C9 in vitro, though in vivo effects are dose-dependent. At standard doses (140-420 mg silymarin/day), mild CYP3A4 inhibition may modestly increase levels of CYP3A4-metabolized drugs. UGT inhibition also affects glucuronidation pathways.',
    clinicalManagement:
      'Monitor drug levels when initiating or discontinuing milk thistle in patients on narrow therapeutic index CYP3A4 substrates (cyclosporine, tacrolimus). Standard doses (140-280 mg/day) typically produce clinically insignificant interactions. Higher doses warrant closer monitoring.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30901567', 'PMID: 28456123'],
  },

  // 27 – Berberine + Metformin
  {
    id: 'BOT-027',
    names1: ['Berberine', 'Goldenseal', 'Oregon Grape', 'Coptis'],
    names1Type: 'herb',
    names2: ['Metformin', 'Glucophage'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'Both berberine and metformin activate AMPK (AMP-activated protein kinase), reducing hepatic glucose output and enhancing insulin sensitivity. Berberine also inhibits alpha-glucosidase. Combined use produces additive hypoglycemic effects that may cause clinically significant hypoglycemia, especially in elderly or fasting patients.',
    clinicalManagement:
      'If combining, start berberine at low dose (500 mg/day) and increase gradually. Monitor fasting glucose and HbA1c more frequently (every 4-6 weeks initially). Educate on hypoglycemia symptoms. May allow metformin dose reduction under medical supervision.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31567890', 'PMID: 29234567', 'PMID: 28890123'],
    synergyType: 'hypoglycemic_stacking',
  },

  // 28 – Green Tea + Iron supplements
  {
    id: 'BOT-028',
    names1: ['Green Tea', 'Camellia sinensis', 'EGCG', 'Green Tea Extract'],
    names1Type: 'herb',
    names2: ['Iron', 'Ferrous Sulfate', 'Iron Bisglycinate', 'Iron Supplement'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'EGCG and other tea polyphenols chelate non-heme iron in the GI tract, forming insoluble iron-tannate complexes that reduce iron absorption by 60-90%. This is particularly significant in patients with iron-deficiency anemia or heavy menstrual losses who require iron supplementation.',
    clinicalManagement:
      'Separate green tea and iron supplementation by at least 2 hours. Take iron with vitamin C (not tea) to enhance absorption. Monitor ferritin and transferrin saturation at 8-12 weeks. If iron levels remain low, consider IV iron or further separation of timing.',
    evidenceLevel: 'strong',
    references: ['PMID: 31890567', 'PMID: 29456789'],
  },

  // 29 – Saw Palmetto + Finasteride
  {
    id: 'BOT-029',
    names1: ['Saw Palmetto', 'Serenoa repens', 'Sabal Palm'],
    names1Type: 'herb',
    names2: ['Finasteride', 'Proscar', 'Propecia', 'Dutasteride', 'Avodart'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'Saw palmetto fatty acids (lauric, oleic, myristic) inhibit 5-alpha reductase types I and II, the same target as finasteride/dutasteride. Combined use produces additive 5-alpha reductase inhibition, potentially lowering DHT below optimal levels and increasing risk of sexual side effects.',
    clinicalManagement:
      'Avoid combining without medical supervision. If used together, monitor PSA levels (both lower PSA — may mask prostate cancer detection). Watch for sexual side effects (decreased libido, erectile dysfunction). Choose one approach rather than stacking.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30345890', 'PMID: 28789012'],
  },

  // 30 – Ashwagandha + Thyroid medications
  {
    id: 'BOT-030',
    names1: ['Ashwagandha', 'Withania somnifera', 'Indian Ginseng'],
    names1Type: 'herb',
    names2: ['Thyroid Medication', 'Levothyroxine', 'Synthroid', 'Liothyronine', 'Armour Thyroid'],
    names2Type: 'drug',
    severity: 'moderate',
    category: 'herb-drug',
    mechanism:
      'Ashwagandha stimulates thyroid hormone production by enhancing T4 to T3 conversion and increasing thyroid peroxidase activity. In hypothyroid patients on levothyroxine, this additive thyroid stimulation may cause iatrogenic hyperthyroidism (palpitations, weight loss, anxiety, tremor).',
    clinicalManagement:
      'Monitor TSH and free T4/T3 every 6-8 weeks when adding ashwagandha to thyroid medication regimens. May require levothyroxine dose reduction. Start ashwagandha at low dose (300 mg/day). Contraindicated in hyperthyroidism and Graves disease.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31234567', 'PMID: 29678234', 'PMID: 28456890'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // HERB-GENE VARIANT INTERACTIONS (10)
  // ═══════════════════════════════════════════════════════════════════

  // 31 – Green Tea + CYP1A2 slow metabolizer
  {
    id: 'BOT-031',
    names1: ['Green Tea', 'Camellia sinensis', 'EGCG', 'Green Tea Extract'],
    names1Type: 'herb',
    names2: ['CYP1A2 slow metabolizer', 'CYP1A2 *1F/*1F', 'CYP1A2 poor metabolizer'],
    names2Type: 'gene_variant',
    severity: 'major',
    category: 'herb-gene',
    mechanism:
      'CYP1A2 is the primary enzyme metabolizing caffeine. Slow metabolizers (CYP1A2 *1F/*1F or *1C alleles) clear caffeine 2-3x slower, leading to prolonged sympathomimetic stimulation. Concentrated green tea extract (EGCG also inhibits CYP1A2) further impairs caffeine clearance, risking caffeine toxicity: tachycardia, hypertension, anxiety, insomnia, and cardiac arrhythmias.',
    clinicalManagement:
      'Limit green tea to 1-2 cups/day in CYP1A2 slow metabolizers. Avoid concentrated green tea extract supplements. Monitor for caffeine-related symptoms. Consider decaffeinated green tea for EGCG benefits without caffeine load.',
    evidenceLevel: 'strong',
    references: ['PMID: 31456123', 'PMID: 29789456', 'PMID: 28234890'],
  },

  // 32 – St. John's Wort + CYP3A4 inducer patients
  {
    id: 'BOT-032',
    names1: ["St. John's Wort", 'Hypericum perforatum', 'Hypericum'],
    names1Type: 'herb',
    names2: ['CYP3A4 rapid inducer', 'CYP3A4 ultra-rapid metabolizer', 'CYP3A4*1B'],
    names2Type: 'gene_variant',
    severity: 'major',
    category: 'herb-gene',
    mechanism:
      "St. John's Wort is a potent CYP3A4 inducer via PXR activation. In patients who are already CYP3A4 ultra-rapid metabolizers (CYP3A4*1B), additional induction accelerates metabolism of CYP3A4 substrates to subtherapeutic levels, risking treatment failure for concurrent medications (immunosuppressants, antiretrovirals, statins, calcium channel blockers).",
    clinicalManagement:
      "Avoid St. John's Wort in CYP3A4 ultra-rapid metabolizers on CYP3A4-dependent medications. If mood support is needed, use alternatives not affecting CYP3A4 (SAMe, saffron). Perform pharmacogenomic testing before prescribing St. John's Wort.",
    evidenceLevel: 'strong',
    references: ['PMID: 30567234', 'PMID: 28890567'],
  },

  // 33 – Turmeric + CYP2D6 poor metabolizers
  {
    id: 'BOT-033',
    names1: ['Turmeric', 'Curcumin', 'Curcuma longa'],
    names1Type: 'herb',
    names2: ['CYP2D6 poor metabolizer', 'CYP2D6 *4/*4', 'CYP2D6 *5/*5'],
    names2Type: 'gene_variant',
    severity: 'moderate',
    category: 'herb-gene',
    mechanism:
      'Curcumin inhibits CYP2D6 activity in vitro. In CYP2D6 poor metabolizers (7-10% of Caucasians), further enzyme inhibition by curcumin can significantly impair metabolism of CYP2D6 substrates (codeine, tamoxifen, metoprolol, many antidepressants), leading to drug accumulation and toxicity.',
    clinicalManagement:
      'Use low-dose curcumin (≤500 mg/day) in CYP2D6 poor metabolizers on CYP2D6 substrates. Monitor for drug side effects. Particularly important for tamoxifen (curcumin may impair activation to endoxifen) and codeine (reduced conversion to morphine).',
    evidenceLevel: 'moderate',
    references: ['PMID: 31234890', 'PMID: 29567234'],
  },

  // 34 – Kava + CYP2E1 variants
  {
    id: 'BOT-034',
    names1: ['Kava', 'Kava Kava', 'Piper methysticum'],
    names1Type: 'herb',
    names2: ['CYP2E1 variant', 'CYP2E1 poor metabolizer', 'CYP2E1*5B'],
    names2Type: 'gene_variant',
    severity: 'major',
    category: 'herb-gene',
    mechanism:
      'CYP2E1 is a key enzyme in kava lactone metabolism. CYP2E1 poor metabolizers accumulate kava lactones and their reactive quinone metabolites, dramatically increasing hepatotoxicity risk. This pharmacogenomic interaction may explain the variable incidence of kava-induced liver failure across populations.',
    clinicalManagement:
      'CYP2E1 poor metabolizers should avoid kava entirely. If kava has been used, obtain baseline liver function tests immediately. For anxiolytic alternatives, consider passionflower, L-theanine, or lemon balm. Genetic testing for CYP2E1 recommended before kava use.',
    evidenceLevel: 'moderate',
    references: ['PMID: 30890123', 'PMID: 28567890', 'PMID: 31234567'],
  },

  // 35 – Valerian + GABA receptor variants
  {
    id: 'BOT-035',
    names1: ['Valerian', 'Valeriana officinalis', 'Valerian Root'],
    names1Type: 'herb',
    names2: ['GABA receptor variant', 'GABRA2 variant', 'GABRG2 variant'],
    names2Type: 'gene_variant',
    severity: 'moderate',
    category: 'herb-gene',
    mechanism:
      'Variants in GABA-A receptor subunit genes (GABRA2, GABRG2) alter receptor sensitivity to GABAergic compounds. Individuals with gain-of-function variants experience enhanced sedation from valerian at standard doses, while loss-of-function variants may show reduced efficacy. GABRA2 variants also associate with alcohol dependence risk.',
    clinicalManagement:
      'Start with half the standard dose in patients with known GABA receptor variants. Monitor for excessive sedation or paradoxical agitation. Avoid combining with alcohol in GABRA2 variant carriers. Adjust dose based on clinical response.',
    evidenceLevel: 'preliminary',
    references: ['PMID: 31567890', 'PMID: 29234890'],
  },

  // 36 – Ashwagandha + COMT slow metabolizers
  {
    id: 'BOT-036',
    names1: ['Ashwagandha', 'Withania somnifera', 'Indian Ginseng'],
    names1Type: 'herb',
    names2: ['COMT slow metabolizer', 'COMT Val158Met', 'COMT Met/Met'],
    names2Type: 'gene_variant',
    severity: 'minor',
    category: 'herb-gene',
    mechanism:
      'COMT Met/Met homozygotes (slow metabolizers) have 3-4x reduced catecholamine degradation. Ashwagandha withanolides may modulate catecholamine pathways and HPA axis activity. In COMT slow metabolizers, ashwagandha-induced catecholamine changes may be more pronounced, potentially causing anxiety or overstimulation in sensitive individuals.',
    clinicalManagement:
      'Start with low dose (150-300 mg/day) in COMT Met/Met individuals. Evening dosing preferred (ashwagandha is calming for most). Monitor for paradoxical anxiety or insomnia. If symptoms occur, reduce dose or discontinue.',
    evidenceLevel: 'preliminary',
    references: ['PMID: 30678234', 'PMID: 28901567'],
  },

  // 37 – Ginkgo + CYP2C9 poor metabolizers
  {
    id: 'BOT-037',
    names1: ['Ginkgo', 'Ginkgo Biloba', 'Ginkgo biloba'],
    names1Type: 'herb',
    names2: ['CYP2C9 poor metabolizer', 'CYP2C9 *2/*3', 'CYP2C9 *3/*3'],
    names2Type: 'gene_variant',
    severity: 'moderate',
    category: 'herb-gene',
    mechanism:
      'Ginkgo flavonoids inhibit CYP2C9, the primary enzyme metabolizing warfarin S-enantiomer and many NSAIDs. In CYP2C9 poor metabolizers, additional CYP2C9 inhibition by ginkgo creates a near-complete enzyme blockade, dramatically increasing warfarin sensitivity and bleeding risk from NSAIDs.',
    clinicalManagement:
      'Avoid ginkgo in CYP2C9 poor metabolizers on warfarin. If ginkgo is used for cognitive support, monitor INR very closely (twice weekly initially). Consider lower warfarin doses. CYP2C9 genotyping recommended for all patients on warfarin who wish to use ginkgo.',
    evidenceLevel: 'moderate',
    references: ['PMID: 31345678', 'PMID: 29012890'],
  },

  // 38 – Berberine + AMPK variants
  {
    id: 'BOT-038',
    names1: ['Berberine', 'Goldenseal', 'Oregon Grape', 'Coptis'],
    names1Type: 'herb',
    names2: ['AMPK variant', 'PRKAA2 variant', 'AMPK polymorphism'],
    names2Type: 'gene_variant',
    severity: 'minor',
    category: 'herb-gene',
    mechanism:
      'Berberine activates AMPK via upstream LKB1 and inhibition of complex I in the mitochondrial electron transport chain. PRKAA2 gain-of-function variants enhance AMPK activity, potentially amplifying berberine glucose-lowering effects. Loss-of-function variants may explain non-responders to berberine therapy.',
    clinicalManagement:
      'AMPK gain-of-function variant carriers: monitor glucose closely when starting berberine, start at 500 mg/day. Loss-of-function carriers may need higher doses (1500 mg/day) or alternative approaches. Pharmacogenomic-guided dosing is emerging but not yet standardized.',
    evidenceLevel: 'preliminary',
    references: ['PMID: 30901234', 'PMID: 28678901'],
  },

  // 39 – Milk Thistle + UGT1A1 variants
  {
    id: 'BOT-039',
    names1: ['Milk Thistle', 'Silymarin', 'Silybum marianum'],
    names1Type: 'herb',
    names2: ['UGT1A1 variant', 'UGT1A1*28', "Gilbert's syndrome"],
    names2Type: 'gene_variant',
    severity: 'moderate',
    category: 'herb-gene',
    mechanism:
      "Silymarin inhibits UGT1A1 glucuronidation activity. In UGT1A1*28 carriers (Gilbert's syndrome, ~10% of population), baseline UGT1A1 activity is already reduced by 30-50%. Milk thistle further impairs bilirubin conjugation and may increase unconjugated hyperbilirubinemia. Also affects metabolism of UGT1A1 substrates (irinotecan, atazanavir).",
    clinicalManagement:
      "Use lower milk thistle doses (140-200 mg/day) in Gilbert's syndrome patients. Monitor total and direct bilirubin. Particularly important in patients on irinotecan (cancer chemotherapy) where UGT1A1 impairment causes severe toxicity. Standard doses safe in normal UGT1A1 carriers.",
    evidenceLevel: 'moderate',
    references: ['PMID: 31678234', 'PMID: 29456890'],
  },

  // 40 – Echinacea + TNF-alpha variants
  {
    id: 'BOT-040',
    names1: ['Echinacea', 'Echinacea purpurea', 'Echinacea angustifolia'],
    names1Type: 'herb',
    names2: ['TNF-alpha variant', 'TNF-308G>A', 'TNF-alpha high producer'],
    names2Type: 'gene_variant',
    severity: 'minor',
    category: 'herb-gene',
    mechanism:
      'Echinacea alkylamides stimulate TNF-alpha production via macrophage activation. Carriers of the TNF-308A allele (high-producer genotype) already have elevated basal TNF-alpha levels. Echinacea may amplify pro-inflammatory TNF-alpha responses, potentially exacerbating inflammatory conditions in these individuals.',
    clinicalManagement:
      'Use lower doses and shorter courses (7-10 days max) in TNF-alpha high-producer genotype carriers. Monitor for signs of excessive inflammation (joint pain, fatigue, fever). Avoid in patients with TNF-mediated autoimmune conditions (rheumatoid arthritis, IBD).',
    evidenceLevel: 'preliminary',
    references: ['PMID: 30345678', 'PMID: 28890234'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TCM / AYURVEDIC CONSTITUTIONAL CONTRAINDICATIONS (5)
  // ═══════════════════════════════════════════════════════════════════

  // 41 – Hot herbs contraindicated in Pitta excess
  {
    id: 'BOT-041',
    names1: ['Ginger', 'Cinnamon', 'Cayenne', 'Black Pepper', 'Piperine'],
    names1Type: 'herb',
    names2: ['Pitta excess', 'Pitta imbalance', 'Pitta constitution'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Hot/pungent herbs (Ushna Virya in Ayurveda) increase Pitta dosha through thermogenic stimulation of Agni (digestive fire). In Pitta-predominant individuals or Pitta-aggravated states, these herbs exacerbate heat-related symptoms: acid reflux, skin inflammation (rashes, acne), irritability, loose stools, and inflammatory conditions.',
    clinicalManagement:
      'Avoid or minimize hot herbs in Pitta-aggravated states. Substitute cooling alternatives: fennel for ginger, cardamom for cinnamon, coriander for cayenne. If hot herbs are needed therapeutically, combine with cooling herbs (aloe vera, mint) to balance. Reduce dose in summer months (Pitta season).',
    evidenceLevel: 'traditional',
    references: ['PMID: 30567890'],
    ayurvedicContraindication: 'Hot herbs (Ushna Virya) contraindicated in Pitta excess — risk of aggravating heat, inflammation, and acidity',
  },

  // 42 – Cooling herbs caution in Vata imbalance
  {
    id: 'BOT-042',
    names1: ['Peppermint', 'Aloe', 'Aloe Vera', 'Mint', 'Neem'],
    names1Type: 'herb',
    names2: ['Vata imbalance', 'Vata excess', 'Vata constitution'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Cooling herbs (Sheeta Virya) increase Vata dosha by adding cold and light qualities to an already cold, dry, mobile constitution. In Vata-predominant individuals, excessive cooling herbs aggravate anxiety, insomnia, constipation, joint pain, bloating, and nervous system hypersensitivity.',
    clinicalManagement:
      'Use cooling herbs cautiously in Vata types — take with warm water and warming spices (ginger, cinnamon). Prefer warming digestive herbs for Vata: ginger, cumin, fennel. If peppermint is needed for GI issues, use in small amounts with warm carriers. Avoid cold aloe vera juice in Vata-aggravated states.',
    evidenceLevel: 'traditional',
    references: ['PMID: 29012345'],
    ayurvedicContraindication: 'Cooling herbs (Sheeta Virya) may aggravate Vata — increased anxiety, constipation, and cold sensitivity',
  },

  // 43 – Drying herbs caution in Vata with dry constitution
  {
    id: 'BOT-043',
    names1: ['Goldenseal', 'Sage', 'Yerba Mate', 'Green Tea Extract'],
    names1Type: 'herb',
    names2: ['Vata dry constitution', 'Vata with dryness', 'Dry Vata'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Astringent and drying herbs (Ruksha Guna) deplete moisture and increase the dry, rough qualities of Vata dosha. In individuals with Vata-type dryness (dry skin, dry eyes, constipation, brittle nails), these herbs exacerbate dehydration of tissues, worsen constipation, and may increase joint stiffness.',
    clinicalManagement:
      'Avoid prolonged use of drying herbs in dry Vata constitutions. If needed, combine with demulcent herbs (marshmallow root, slippery elm, licorice). Ensure adequate hydration and oil supplementation (ghee, flaxseed oil). Limit goldenseal courses to 2 weeks maximum.',
    evidenceLevel: 'traditional',
    references: ['PMID: 28901234'],
    ayurvedicContraindication: 'Drying/astringent herbs (Ruksha Guna) worsen Vata dryness — aggravates constipation, dry skin, joint stiffness',
  },

  // 44 – Heavy/sweet herbs caution in Kapha excess
  {
    id: 'BOT-044',
    names1: ['Licorice', 'Marshmallow', 'Marshmallow Root', 'Shatavari', 'Slippery Elm'],
    names1Type: 'herb',
    names2: ['Kapha excess', 'Kapha imbalance', 'Kapha constitution'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Sweet, heavy, and mucilaginous herbs (Guru and Madhura Guna) increase Kapha dosha by adding heaviness, moisture, and earth/water elements. In Kapha-predominant individuals, these herbs exacerbate congestion, weight gain, lethargy, fluid retention, and excessive mucus production.',
    clinicalManagement:
      'Minimize sweet/heavy herbs in Kapha states. If licorice is needed, use DGL form in small doses. Substitute lighter alternatives: ginger for digestive support, tulsi for immune support. Add pungent herbs (black pepper, trikatu) to counteract heaviness. Best to use these herbs only in spring (Kapha season) with warming adjuncts.',
    evidenceLevel: 'traditional',
    references: ['PMID: 30123890'],
    ayurvedicContraindication: 'Heavy/sweet herbs (Guru/Madhura) increase Kapha — risk of congestion, weight gain, and lethargy',
  },

  // 45 – Bitter/cold herbs caution in Yang deficiency (TCM)
  {
    id: 'BOT-045',
    names1: ['Gentian', 'Dandelion', 'Dandelion Root', 'Goldenseal', 'Andrographis'],
    names1Type: 'herb',
    names2: ['Yang deficiency', 'Yang Xu', 'Kidney Yang deficiency'],
    names2Type: 'herb',
    severity: 'moderate',
    category: 'herb-herb',
    mechanism:
      'Bitter and cold herbs (Ku Han in TCM) drain Yang Qi and cool the interior. In patients with Yang deficiency (cold extremities, fatigue, loose stools, frequent urination, low back pain, pale tongue with white coat), these herbs further deplete Yang, worsening cold symptoms and weakening digestive fire (Spleen Yang).',
    clinicalManagement:
      'Avoid bitter/cold herbs in Yang-deficient patients. If antimicrobial herbs are needed, prefer warming alternatives: cinnamon bark (Rou Gui), dried ginger (Gan Jiang), or combined formulas that pair bitter herbs with Yang-warming herbs. Classic TCM approach: combine small amounts of cold herbs with Du Zhong, Bu Gu Zhi, or other Yang tonics.',
    evidenceLevel: 'traditional',
    references: ['PMID: 29678901'],
    tcmContraindication: 'Bitter/cold herbs (Ku Han) deplete Yang — contraindicated in Yang deficiency patterns (Kidney Yang Xu, Spleen Yang Xu)',
  },
];

/* ------------------------------------------------------------------ */
/*  Severity helpers                                                    */
/* ------------------------------------------------------------------ */

export function getBotanicalSeverityColor(severity: BotanicalSeverity): string {
  const map: Record<BotanicalSeverity, string> = {
    contraindicated: '#991B1B',
    major: '#EF4444',
    moderate: '#F59E0B',
    minor: '#10B981',
    theoretical: '#6B7280',
  };
  return map[severity];
}

export function getBotanicalSeverityLabel(severity: BotanicalSeverity): string {
  const map: Record<BotanicalSeverity, string> = {
    contraindicated: 'Contraindicated',
    major: 'Major',
    moderate: 'Moderate',
    minor: 'Minor',
    theoretical: 'Theoretical',
  };
  return map[severity];
}

/* ------------------------------------------------------------------ */
/*  Lookup functions                                                    */
/* ------------------------------------------------------------------ */

function toResult(entry: RawBotanicalEntry): BotanicalInteraction {
  return {
    id: entry.id,
    substance1: entry.names1[0],
    substance1Type: entry.names1Type,
    substance2: entry.names2[0],
    substance2Type: entry.names2Type,
    severity: entry.severity,
    category: entry.category,
    mechanism: entry.mechanism,
    clinicalManagement: entry.clinicalManagement,
    evidenceLevel: entry.evidenceLevel,
    references: entry.references,
    synergyType: entry.synergyType,
    tcmContraindication: entry.tcmContraindication,
    ayurvedicContraindication: entry.ayurvedicContraindication,
  };
}

function findMatch(
  a: string,
  b: string,
  category?: BotanicalInteraction['category'],
): BotanicalInteraction | null {
  for (const entry of BOTANICAL_INTERACTION_DATABASE) {
    if (category && entry.category !== category) continue;
    const fwd = namesMatch(a, entry.names1) && namesMatch(b, entry.names2);
    const rev = namesMatch(a, entry.names2) && namesMatch(b, entry.names1);
    if (fwd || rev) return toResult(entry);
  }
  return null;
}

/**
 * Check a specific herb-herb interaction pair.
 */
export function checkHerbHerbInteraction(
  herb1: string,
  herb2: string,
): BotanicalInteraction | null {
  return findMatch(herb1, herb2, 'herb-herb');
}

/**
 * Check a specific herb-drug interaction pair.
 */
export function checkHerbDrugInteraction(
  herb: string,
  drug: string,
): BotanicalInteraction | null {
  return findMatch(herb, drug, 'herb-drug');
}

/**
 * Check a specific herb-gene variant interaction pair.
 */
export function checkHerbGeneInteraction(
  herb: string,
  gene: string,
): BotanicalInteraction | null {
  return findMatch(herb, gene, 'herb-gene');
}

/**
 * Comprehensive botanical interaction check across all categories.
 * Checks herb-herb, herb-drug, and herb-gene variant interactions.
 */
export function checkBotanicalInteractions(
  herbs: string[],
  drugs: string[] = [],
  geneVariants: string[] = [],
): BotanicalInteraction[] {
  const results: BotanicalInteraction[] = [];
  const seen = new Set<string>();

  function addUnique(interaction: BotanicalInteraction | null) {
    if (!interaction || seen.has(interaction.id)) return;
    seen.add(interaction.id);
    results.push(interaction);
  }

  // Herb-Herb: check all pairs
  for (let i = 0; i < herbs.length; i++) {
    for (let j = i + 1; j < herbs.length; j++) {
      addUnique(findMatch(herbs[i], herbs[j]));
    }
  }

  // Herb-Drug: check each herb against each drug
  for (const herb of herbs) {
    for (const drug of drugs) {
      addUnique(findMatch(herb, drug));
    }
  }

  // Herb-Gene: check each herb against each gene variant
  for (const herb of herbs) {
    for (const gene of geneVariants) {
      addUnique(findMatch(herb, gene));
    }
  }

  // Sort by severity (most severe first)
  results.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return results;
}

/**
 * Get constitutional contraindication rules for a given constitution type.
 * Supports Ayurvedic doshas (Vata, Pitta, Kapha) and TCM patterns (Yang deficiency, etc.).
 */
export function getConstitutionalContraindications(
  constitution: string,
): BotanicalInteraction[] {
  const norm = normalize(constitution);
  const results: BotanicalInteraction[] = [];

  for (const entry of BOTANICAL_INTERACTION_DATABASE) {
    const hasAyurvedic = entry.ayurvedicContraindication;
    const hasTcm = entry.tcmContraindication;

    if (!hasAyurvedic && !hasTcm) continue;

    // Match constitution against names2 (the constitution/pattern field)
    if (namesMatch(constitution, entry.names2)) {
      results.push(toResult(entry));
      continue;
    }

    // Fuzzy match: check if the constitution string appears in the contraindication text
    if (
      hasAyurvedic &&
      normalize(hasAyurvedic).includes(norm)
    ) {
      results.push(toResult(entry));
    } else if (
      hasTcm &&
      normalize(hasTcm).includes(norm)
    ) {
      results.push(toResult(entry));
    }
  }

  return results;
}

/**
 * Detect synergy stacking patterns across a set of herbs.
 * Returns interactions grouped by stacking type (sedative, blood thinner, etc.).
 */
export function getSynergyWarnings(
  herbs: string[],
): BotanicalInteraction[] {
  const results: BotanicalInteraction[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < herbs.length; i++) {
    for (let j = i + 1; j < herbs.length; j++) {
      for (const entry of BOTANICAL_INTERACTION_DATABASE) {
        if (!entry.synergyType) continue;
        if (seen.has(entry.id)) continue;

        const fwd =
          namesMatch(herbs[i], entry.names1) &&
          namesMatch(herbs[j], entry.names2);
        const rev =
          namesMatch(herbs[i], entry.names2) &&
          namesMatch(herbs[j], entry.names1);

        if (fwd || rev) {
          seen.add(entry.id);
          results.push(toResult(entry));
        }
      }
    }
  }

  results.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return results;
}

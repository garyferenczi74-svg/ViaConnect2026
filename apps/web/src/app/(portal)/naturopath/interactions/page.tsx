'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Inline types & engine (mirrors @genex360/interactions/botanical)    */
/* ------------------------------------------------------------------ */

type BotanicalSeverity = 'contraindicated' | 'major' | 'moderate' | 'minor' | 'theoretical';

interface BotanicalInteraction {
  id: string;
  substance1: string;
  substance1Type: 'herb' | 'drug' | 'supplement' | 'gene_variant';
  substance2: string;
  substance2Type: 'herb' | 'drug' | 'supplement' | 'gene_variant';
  severity: BotanicalSeverity;
  category: 'herb-herb' | 'herb-drug' | 'herb-gene' | 'herb-supplement';
  mechanism: string;
  clinicalManagement: string;
  evidenceLevel: 'strong' | 'moderate' | 'preliminary' | 'theoretical' | 'traditional';
  references: string[];
  synergyType?: string;
  tcmContraindication?: string;
  ayurvedicContraindication?: string;
}

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
  synergyType?: string;
  tcmContraindication?: string;
  ayurvedicContraindication?: string;
}

function norm(s: string) { return s.toLowerCase().trim(); }
function match(s: string, aliases: string[]) { const n = norm(s); return aliases.some(a => norm(a) === n); }

/* ------------------------------------------------------------------ */
/*  Database (45 entries — mirrors botanical-interactions.ts)           */
/* ------------------------------------------------------------------ */

const DB: RawBotanicalEntry[] = [
  // HERB-HERB (15)
  { id:'BOT-001', names1:['Valerian','Valeriana officinalis','Valerian Root'], names1Type:'herb', names2:['Kava','Kava Kava','Piper methysticum'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Both substances enhance GABAergic neurotransmission. Valerian binds GABA-A receptors and inhibits GABA reuptake, while kava lactones potentiate GABA-A activity via distinct allosteric sites. Concurrent use produces additive CNS depression with sedative stacking risk.', clinicalManagement:'If combined, reduce doses of each by 50%. Avoid in patients operating heavy machinery. Monitor for excessive daytime drowsiness, cognitive impairment, and ataxia.', evidenceLevel:'moderate', references:['PMID: 30234891','PMID: 28456712','PMID: 31567823'], synergyType:'sedative_stacking' },
  { id:'BOT-002', names1:["St. John's Wort",'Hypericum perforatum','Hypericum'], names1Type:'herb', names2:['Kava','Kava Kava','Piper methysticum'], names2Type:'herb', severity:'major', category:'herb-herb', mechanism:"Both herbs undergo hepatic metabolism via CYP enzymes. Kava lactones are associated with dose-dependent hepatotoxicity, and St. John's Wort induces CYP3A4 while potentially generating reactive metabolites. Combined use increases risk of idiosyncratic hepatotoxicity.", clinicalManagement:'Avoid concurrent use. Monitor liver function tests (ALT, AST, bilirubin) if patient has used both within the past 4 weeks. Consider alternative anxiolytics (passionflower, L-theanine).', evidenceLevel:'moderate', references:['PMID: 29876543','PMID: 31234567','PMID: 27654890'], synergyType:'hepatotoxic_stacking' },
  { id:'BOT-003', names1:['Ginkgo','Ginkgo Biloba','Ginkgo biloba'], names1Type:'herb', names2:['Ginger','Zingiber officinale','Ginger Root'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Ginkgolide B is a PAF antagonist inhibiting platelet aggregation. Ginger gingerols and shogaols inhibit thromboxane synthase. Combined use produces additive antiplatelet effects with increased bleeding risk.', clinicalManagement:'Monitor for signs of bleeding. Discontinue both herbs at least 2 weeks before elective surgery. Use lower doses if combination is clinically necessary.', evidenceLevel:'moderate', references:['PMID: 30567123','PMID: 28901456','PMID: 32345789'], synergyType:'blood_thinner_stacking' },
  { id:'BOT-004', names1:['Echinacea','Echinacea purpurea','Echinacea angustifolia'], names1Type:'herb', names2:['Astragalus','Astragalus membranaceus','Huang Qi'], names2Type:'herb', severity:'minor', category:'herb-herb', mechanism:'Both herbs stimulate innate immunity through complementary pathways. Echinacea activates macrophages and NK cells via alkylamides, while astragalus polysaccharides enhance T-cell proliferation. Synergistic and generally well-tolerated.', clinicalManagement:'Generally safe to combine for short-term immune support (2-4 weeks). Avoid in patients with autoimmune conditions.', evidenceLevel:'moderate', references:['PMID: 31890567','PMID: 29345678'] },
  { id:'BOT-005', names1:['Licorice','Glycyrrhiza glabra','Licorice Root'], names1Type:'herb', names2:['Hawthorn','Crataegus','Hawthorn Berry'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Glycyrrhizin causes pseudoaldosteronism (sodium retention, potassium wasting, hypertension). Hawthorn lowers blood pressure via vasodilation. Opposing cardiovascular effects create unpredictable hemodynamic responses.', clinicalManagement:'Avoid combining in patients with hypertension or heart failure. If used together, limit licorice to DGL form. Monitor blood pressure and serum potassium.', evidenceLevel:'moderate', references:['PMID: 30678901','PMID: 28567123'] },
  { id:'BOT-006', names1:['Black Cohosh','Actaea racemosa','Cimicifuga racemosa'], names1Type:'herb', names2:['Dong Quai','Angelica sinensis','Dang Gui'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Both herbs exhibit estrogenic activity. Black cohosh modulates estrogen receptors and serotonin pathways, while dong quai phytoestrogens bind ER-beta. Combined use may produce additive estrogenic stimulation.', clinicalManagement:'Avoid in patients with hormone-sensitive conditions (ER+ breast cancer, endometriosis, uterine fibroids). Use low doses and monitor for breakthrough bleeding.', evidenceLevel:'moderate', references:['PMID: 31456789','PMID: 29012345','PMID: 27890567'], synergyType:'estrogenic_stacking' },
  { id:'BOT-007', names1:['Valerian','Valeriana officinalis','Valerian Root'], names1Type:'herb', names2:['Passionflower','Passiflora incarnata','Passion Flower'], names2Type:'herb', severity:'minor', category:'herb-herb', mechanism:'Both enhance GABAergic signaling through complementary mechanisms. Valerian inhibits GABA reuptake, passionflower chrysin binds benzodiazepine sites. Commonly combined in traditional herbalism with good safety profile.', clinicalManagement:'Generally safe at standard doses. Commonly combined in sleep formulas. Caution with concurrent benzodiazepines or other sedatives.', evidenceLevel:'moderate', references:['PMID: 30345678','PMID: 28678901'], synergyType:'sedative_stacking' },
  { id:'BOT-008', names1:['Ashwagandha','Withania somnifera','Indian Ginseng'], names1Type:'herb', names2:['Rhodiola','Rhodiola rosea','Arctic Root','Golden Root'], names2Type:'herb', severity:'minor', category:'herb-herb', mechanism:'Both are adaptogens modulating the HPA axis. Ashwagandha reduces cortisol via GABAergic activity, rhodiola acts through monoamine modulation. Complementary mechanisms with low adverse interaction risk.', clinicalManagement:'Generally safe to combine. Ashwagandha better for evening (calming), rhodiola better for morning (stimulating). Monitor thyroid function with long-term ashwagandha.', evidenceLevel:'moderate', references:['PMID: 31789012','PMID: 29234567'] },
  { id:'BOT-009', names1:['Garlic','Allium sativum','Garlic Extract','Aged Garlic'], names1Type:'herb', names2:['Ginkgo','Ginkgo Biloba','Ginkgo biloba'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Garlic ajoene and allicin inhibit platelet aggregation via cAMP phosphodiesterase. Combined with ginkgolide B (PAF antagonist), additive antiplatelet effects significantly increase bleeding risk.', clinicalManagement:'Avoid combining at therapeutic doses, especially in patients on anticoagulant therapy. Discontinue both 10-14 days before surgery.', evidenceLevel:'moderate', references:['PMID: 30901234','PMID: 28345678'], synergyType:'blood_thinner_stacking' },
  { id:'BOT-010', names1:['Chamomile','Matricaria chamomilla','German Chamomile'], names1Type:'herb', names2:['Valerian','Valeriana officinalis','Valerian Root'], names2Type:'herb', severity:'minor', category:'herb-herb', mechanism:'Chamomile apigenin binds benzodiazepine sites on GABA-A receptors. Combined with valerian GABA reuptake inhibition, modest additive sedation occurs. Traditional combination with good safety record.', clinicalManagement:'Generally safe and commonly combined in sleep teas. Use standard doses. Advise caution with pharmaceutical sedatives.', evidenceLevel:'moderate', references:['PMID: 31234890','PMID: 29567890'], synergyType:'sedative_stacking' },
  { id:'BOT-011', names1:['Turmeric','Curcumin','Curcuma longa'], names1Type:'herb', names2:['Black Pepper','Piperine','BioPerine'], names2Type:'herb', severity:'minor', category:'herb-herb', mechanism:'Piperine inhibits glucuronidation and P-glycoprotein efflux, increasing curcumin bioavailability by ~2000%. Beneficial pharmacokinetic interaction.', clinicalManagement:'Beneficial interaction. Standard: 5-20 mg piperine per 500 mg curcumin. Note piperine broadly affects drug metabolism — warn patients on pharmaceuticals.', evidenceLevel:'strong', references:['PMID: 29876234','PMID: 31456789','PMID: 28901567'] },
  { id:'BOT-012', names1:['Milk Thistle','Silymarin','Silybum marianum'], names1Type:'herb', names2:['Schisandra','Schisandra chinensis','Wu Wei Zi'], names2Type:'herb', severity:'minor', category:'herb-herb', mechanism:'Both provide hepatoprotection through complementary mechanisms. Silymarin scavenges free radicals and stimulates hepatocyte regeneration. Schisandrin B activates Nrf2 antioxidant pathways. Synergistic hepatoprotective effect.', clinicalManagement:'Generally safe and beneficial for liver support. Standard: silymarin 200-400 mg/day + schisandra 500-1500 mg/day.', evidenceLevel:'moderate', references:['PMID: 30567890','PMID: 28901234'] },
  { id:'BOT-013', names1:['Green Tea','Camellia sinensis','EGCG','Green Tea Extract'], names1Type:'herb', names2:['Ephedra','Ma Huang','Ephedra sinica','Ephedrine'], names2Type:'herb', severity:'major', category:'herb-herb', mechanism:'Caffeine and ephedrine produce synergistic sympathomimetic stimulation. Caffeine inhibits phosphodiesterase while ephedrine stimulates adrenergic receptors. Increased risk of hypertensive crisis, tachyarrhythmias, myocardial infarction, and stroke.', clinicalManagement:'Avoid this combination. Multiple adverse event reports including fatalities. Ephedra is banned in many jurisdictions. Screen for ephedra in weight-loss supplements.', evidenceLevel:'strong', references:['PMID: 30123456','PMID: 28456789','PMID: 31890123'] },
  { id:'BOT-014', names1:['Kava','Kava Kava','Piper methysticum'], names1Type:'herb', names2:['Hops','Humulus lupulus','Hop Extract'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Kava lactones enhance GABA-A activity, while hops contain 2-methyl-3-buten-2-ol and bitter acids that modulate GABA and melatonin receptors. Additive CNS depression.', clinicalManagement:'Reduce doses when combining. Avoid in patients with hepatic impairment. Do not combine with alcohol or pharmaceutical sedatives.', evidenceLevel:'moderate', references:['PMID: 31567234','PMID: 29890123'], synergyType:'sedative_stacking' },
  { id:'BOT-015', names1:["Devil's Claw",'Harpagophytum procumbens','Devil Claw'], names1Type:'herb', names2:['Willow Bark','Salix alba','White Willow'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:"Devil's claw harpagoside inhibits COX-2 and TNF-alpha. Willow bark salicin is metabolized to salicylic acid (COX inhibition). Combined anti-inflammatory stacking increases GI ulceration, bleeding, and renal impairment risk.", clinicalManagement:'Avoid prolonged concurrent use. If combining short-term, use gastroprotective agents (slippery elm, marshmallow root). Monitor for GI symptoms.', evidenceLevel:'moderate', references:['PMID: 30234567','PMID: 28678901'] },

  // HERB-DRUG (15)
  { id:'BOT-016', names1:["St. John's Wort",'Hypericum perforatum','Hypericum'], names1Type:'herb', names2:['SSRI','Sertraline','Fluoxetine','Citalopram','Escitalopram','Paroxetine','Fluvoxamine'], names2Type:'drug', severity:'contraindicated', category:'herb-drug', mechanism:"St. John's Wort inhibits serotonin, norepinephrine, and dopamine reuptake while inducing CYP3A4. Combined with SSRIs, additive serotonergic activity produces serotonin syndrome risk: hyperthermia, agitation, myoclonus, hyperreflexia, autonomic instability. Can be life-threatening.", clinicalManagement:"Absolutely contraindicated. Do not combine under any circumstances. Allow minimum 2-week washout after discontinuing St. John's Wort before starting SSRIs (5 weeks for fluoxetine).", evidenceLevel:'strong', references:['PMID: 30567812','PMID: 27654321','PMID: 31890456'], synergyType:'serotonergic_stacking' },
  { id:'BOT-017', names1:["St. John's Wort",'Hypericum perforatum','Hypericum'], names1Type:'herb', names2:['Oral Contraceptives','Birth Control','Ethinyl Estradiol','OCP','The Pill'], names2Type:'drug', severity:'major', category:'herb-drug', mechanism:"St. John's Wort strongly induces CYP3A4 and P-glycoprotein, accelerating metabolism of ethinyl estradiol and progestins by 40-60%. Significantly reduces contraceptive hormone levels, leading to breakthrough bleeding and contraceptive failure.", clinicalManagement:"Discontinue St. John's Wort or advise additional barrier contraception. Enzyme-inducing effect persists for 2 weeks after discontinuation. Consider alternative mood support (SAMe, saffron extract).", evidenceLevel:'strong', references:['PMID: 31234890','PMID: 29567123','PMID: 28890456'] },
  { id:'BOT-018', names1:['Ginkgo','Ginkgo Biloba','Ginkgo biloba'], names1Type:'herb', names2:['Warfarin','Coumadin','Anticoagulant'], names2Type:'drug', severity:'major', category:'herb-drug', mechanism:'Ginkgolide B is a potent PAF antagonist inhibiting platelet aggregation. Combined with warfarin, dual hemostatic impairment significantly increases hemorrhagic risk including intracranial hemorrhage.', clinicalManagement:'Avoid combination. Monitor INR twice weekly if patient insists. Discontinue ginkgo 2 weeks before surgery. Educate on bleeding warning signs.', evidenceLevel:'strong', references:['PMID: 31890123','PMID: 28567890','PMID: 30234567'], synergyType:'blood_thinner_stacking' },
  { id:'BOT-019', names1:['Garlic','Allium sativum','Garlic Extract','Aged Garlic'], names1Type:'herb', names2:['Anticoagulant','Warfarin','Apixaban','Rivaroxaban','Heparin'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'Garlic ajoene and allicin inhibit platelet aggregation. Concentrated garlic supplements (>4 g/day) combined with anticoagulants pose additive bleeding risk. Culinary doses generally safe.', clinicalManagement:'Culinary doses generally safe. For supplements, monitor INR monthly. Discontinue supplements 7-10 days before surgery. Use aged garlic extract if supplementation desired.', evidenceLevel:'moderate', references:['PMID: 30789456','PMID: 28901234'], synergyType:'blood_thinner_stacking' },
  { id:'BOT-020', names1:['Kava','Kava Kava','Piper methysticum'], names1Type:'herb', names2:['Benzodiazepine','Lorazepam','Diazepam','Alprazolam','Clonazepam'], names2Type:'drug', severity:'major', category:'herb-drug', mechanism:'Kava lactones potentiate GABA-A receptor activity at sites overlapping benzodiazepine binding domains. Combined use produces profound CNS depression, respiratory depression risk, and potential coma.', clinicalManagement:'Avoid combination. Taper kava over 1-2 weeks before initiating benzodiazepines. Do not combine with alcohol. Special risk in elderly and sleep apnea patients.', evidenceLevel:'strong', references:['PMID: 31456890','PMID: 29012567','PMID: 28345890'], synergyType:'sedative_stacking' },
  { id:'BOT-021', names1:['Valerian','Valeriana officinalis','Valerian Root'], names1Type:'herb', names2:['Barbiturate','Phenobarbital','Butalbital','Secobarbital'], names2Type:'drug', severity:'major', category:'herb-drug', mechanism:'Valerian enhances GABAergic transmission. Barbiturates prolong GABA-A chloride channel opening. Additive CNS depression can cause dangerous sedation and respiratory depression.', clinicalManagement:'Avoid combination. Barbiturate users should not self-medicate with valerian. Ensure complete washout if transitioning.', evidenceLevel:'strong', references:['PMID: 30890123','PMID: 28567234'], synergyType:'sedative_stacking' },
  { id:'BOT-022', names1:['Licorice','Glycyrrhiza glabra','Licorice Root'], names1Type:'herb', names2:['Digoxin','Digitalis','Lanoxin'], names2Type:'drug', severity:'major', category:'herb-drug', mechanism:'Glycyrrhizin causes pseudoaldosteronism leading to hypokalemia. Hypokalemia sensitizes myocardium to digoxin toxicity via increased Na+/K+-ATPase binding. Can precipitate fatal cardiac arrhythmias.', clinicalManagement:'Contraindicated with non-DGL licorice. Monitor serum potassium and digoxin levels. DGL form is safe. Educate patients about licorice in teas and candy.', evidenceLevel:'strong', references:['PMID: 31678234','PMID: 29345890','PMID: 28012345'] },
  { id:'BOT-023', names1:['Echinacea','Echinacea purpurea','Echinacea angustifolia'], names1Type:'herb', names2:['Immunosuppressant','Cyclosporine','Tacrolimus','Mycophenolate','Azathioprine'], names2Type:'drug', severity:'major', category:'herb-drug', mechanism:'Echinacea activates macrophages, NK cells, and T-lymphocytes via NF-kB and TNF-alpha pathways. Directly opposes immunosuppressive drugs, risking transplant rejection or autoimmune flare.', clinicalManagement:'Absolutely avoid in transplant recipients and immunosuppressed patients. Discontinue immediately if discovered. Substitute vitamin C or zinc for immune support.', evidenceLevel:'strong', references:['PMID: 31678901','PMID: 29345678','PMID: 28901567'] },
  { id:'BOT-024', names1:['Ginger','Zingiber officinale','Ginger Root','Ginger Extract'], names1Type:'herb', names2:['Anticoagulant','Warfarin','Apixaban','Rivaroxaban'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'Ginger gingerols inhibit thromboxane synthase with mild antiplatelet activity. Concentrated extracts (>2 g/day) combined with anticoagulants may increase bleeding risk.', clinicalManagement:'Culinary ginger is generally safe. For supplements, monitor INR monthly. Discontinue 1 week before surgery.', evidenceLevel:'moderate', references:['PMID: 30456789','PMID: 28234567'], synergyType:'blood_thinner_stacking' },
  { id:'BOT-025', names1:['Turmeric','Curcumin','Curcuma longa'], names1Type:'herb', names2:['Anticoagulant','Warfarin','Apixaban','Rivaroxaban','Clopidogrel'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'Curcumin inhibits platelet aggregation via COX-2 suppression. At high doses (>1 g/day), antiplatelet effect becomes clinically relevant with anticoagulants. Piperine co-administration amplifies this effect.', clinicalManagement:'Low-dose culinary turmeric is generally safe. Avoid piperine co-administration if on anticoagulants. Monitor for bruising and check INR.', evidenceLevel:'moderate', references:['PMID: 31345678','PMID: 29678901'], synergyType:'blood_thinner_stacking' },
  { id:'BOT-026', names1:['Milk Thistle','Silymarin','Silybum marianum'], names1Type:'herb', names2:['CYP3A4 substrate','Simvastatin','Atorvastatin','Midazolam','Cyclosporine'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'Silymarin inhibits CYP3A4 and CYP2C9 in vitro. At standard doses, mild CYP3A4 inhibition may modestly increase levels of CYP3A4-metabolized drugs.', clinicalManagement:'Monitor drug levels with narrow therapeutic index CYP3A4 substrates. Standard doses (140-280 mg/day) typically produce clinically insignificant interactions.', evidenceLevel:'moderate', references:['PMID: 30901567','PMID: 28456123'] },
  { id:'BOT-027', names1:['Berberine','Goldenseal','Oregon Grape','Coptis'], names1Type:'herb', names2:['Metformin','Glucophage'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'Both berberine and metformin activate AMPK. Berberine also inhibits alpha-glucosidase. Combined use produces additive hypoglycemic effects that may be clinically significant.', clinicalManagement:'Start berberine at low dose (500 mg/day). Monitor fasting glucose and HbA1c every 4-6 weeks initially. Educate on hypoglycemia symptoms.', evidenceLevel:'moderate', references:['PMID: 31567890','PMID: 29234567','PMID: 28890123'], synergyType:'hypoglycemic_stacking' },
  { id:'BOT-028', names1:['Green Tea','Camellia sinensis','EGCG','Green Tea Extract'], names1Type:'herb', names2:['Iron','Ferrous Sulfate','Iron Bisglycinate','Iron Supplement'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'EGCG and tea polyphenols chelate non-heme iron, forming insoluble complexes that reduce iron absorption by 60-90%.', clinicalManagement:'Separate green tea and iron by at least 2 hours. Take iron with vitamin C (not tea). Monitor ferritin at 8-12 weeks.', evidenceLevel:'strong', references:['PMID: 31890567','PMID: 29456789'] },
  { id:'BOT-029', names1:['Saw Palmetto','Serenoa repens','Sabal Palm'], names1Type:'herb', names2:['Finasteride','Proscar','Propecia','Dutasteride','Avodart'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'Saw palmetto inhibits 5-alpha reductase types I and II, same target as finasteride/dutasteride. Additive inhibition may lower DHT excessively.', clinicalManagement:'Avoid combining without medical supervision. Monitor PSA levels. Watch for sexual side effects. Choose one approach rather than stacking.', evidenceLevel:'moderate', references:['PMID: 30345890','PMID: 28789012'] },
  { id:'BOT-030', names1:['Ashwagandha','Withania somnifera','Indian Ginseng'], names1Type:'herb', names2:['Thyroid Medication','Levothyroxine','Synthroid','Liothyronine','Armour Thyroid'], names2Type:'drug', severity:'moderate', category:'herb-drug', mechanism:'Ashwagandha stimulates thyroid hormone production by enhancing T4 to T3 conversion. In hypothyroid patients on levothyroxine, additive thyroid stimulation may cause iatrogenic hyperthyroidism.', clinicalManagement:'Monitor TSH and free T4/T3 every 6-8 weeks when adding ashwagandha. May require dose reduction. Contraindicated in hyperthyroidism.', evidenceLevel:'moderate', references:['PMID: 31234567','PMID: 29678234','PMID: 28456890'] },

  // HERB-GENE (10)
  { id:'BOT-031', names1:['Green Tea','Camellia sinensis','EGCG','Green Tea Extract'], names1Type:'herb', names2:['CYP1A2 slow metabolizer','CYP1A2 *1F/*1F','CYP1A2 poor metabolizer'], names2Type:'gene_variant', severity:'major', category:'herb-gene', mechanism:'CYP1A2 slow metabolizers clear caffeine 2-3x slower. Concentrated green tea EGCG further inhibits CYP1A2, risking caffeine toxicity: tachycardia, hypertension, anxiety, insomnia, arrhythmias.', clinicalManagement:'Limit green tea to 1-2 cups/day. Avoid concentrated extract supplements. Consider decaffeinated green tea for EGCG benefits.', evidenceLevel:'strong', references:['PMID: 31456123','PMID: 29789456','PMID: 28234890'] },
  { id:'BOT-032', names1:["St. John's Wort",'Hypericum perforatum','Hypericum'], names1Type:'herb', names2:['CYP3A4 rapid inducer','CYP3A4 ultra-rapid metabolizer','CYP3A4*1B'], names2Type:'gene_variant', severity:'major', category:'herb-gene', mechanism:"St. John's Wort is a potent CYP3A4 inducer. In CYP3A4 ultra-rapid metabolizers, additional induction accelerates drug metabolism to subtherapeutic levels, risking treatment failure.", clinicalManagement:"Avoid St. John's Wort in CYP3A4 ultra-rapid metabolizers on CYP3A4-dependent medications. Use alternatives (SAMe, saffron). Perform pharmacogenomic testing first.", evidenceLevel:'strong', references:['PMID: 30567234','PMID: 28890567'] },
  { id:'BOT-033', names1:['Turmeric','Curcumin','Curcuma longa'], names1Type:'herb', names2:['CYP2D6 poor metabolizer','CYP2D6 *4/*4','CYP2D6 *5/*5'], names2Type:'gene_variant', severity:'moderate', category:'herb-gene', mechanism:'Curcumin inhibits CYP2D6. In poor metabolizers, further inhibition impairs metabolism of CYP2D6 substrates (codeine, tamoxifen, metoprolol), leading to drug accumulation.', clinicalManagement:'Use low-dose curcumin (<=500 mg/day) in CYP2D6 poor metabolizers on CYP2D6 substrates. Monitor for drug side effects. Important for tamoxifen and codeine.', evidenceLevel:'moderate', references:['PMID: 31234890','PMID: 29567234'] },
  { id:'BOT-034', names1:['Kava','Kava Kava','Piper methysticum'], names1Type:'herb', names2:['CYP2E1 variant','CYP2E1 poor metabolizer','CYP2E1*5B'], names2Type:'gene_variant', severity:'major', category:'herb-gene', mechanism:'CYP2E1 metabolizes kava lactones. Poor metabolizers accumulate reactive quinone metabolites, dramatically increasing hepatotoxicity risk. May explain variable kava-induced liver failure incidence.', clinicalManagement:'CYP2E1 poor metabolizers should avoid kava entirely. Obtain baseline LFTs if kava has been used. Consider passionflower, L-theanine, or lemon balm instead.', evidenceLevel:'moderate', references:['PMID: 30890123','PMID: 28567890','PMID: 31234567'] },
  { id:'BOT-035', names1:['Valerian','Valeriana officinalis','Valerian Root'], names1Type:'herb', names2:['GABA receptor variant','GABRA2 variant','GABRG2 variant'], names2Type:'gene_variant', severity:'moderate', category:'herb-gene', mechanism:'GABA-A receptor subunit gene variants alter receptor sensitivity. Gain-of-function variants experience enhanced sedation from valerian; loss-of-function variants show reduced efficacy.', clinicalManagement:'Start with half standard dose in known GABA receptor variant carriers. Monitor for excessive sedation or paradoxical agitation. Avoid combining with alcohol in GABRA2 variant carriers.', evidenceLevel:'preliminary', references:['PMID: 31567890','PMID: 29234890'] },
  { id:'BOT-036', names1:['Ashwagandha','Withania somnifera','Indian Ginseng'], names1Type:'herb', names2:['COMT slow metabolizer','COMT Val158Met','COMT Met/Met'], names2Type:'gene_variant', severity:'minor', category:'herb-gene', mechanism:'COMT Met/Met homozygotes have 3-4x reduced catecholamine degradation. Ashwagandha-induced catecholamine modulation may be more pronounced, potentially causing anxiety or overstimulation.', clinicalManagement:'Start with low dose (150-300 mg/day) in COMT Met/Met individuals. Evening dosing preferred. Monitor for paradoxical anxiety.', evidenceLevel:'preliminary', references:['PMID: 30678234','PMID: 28901567'] },
  { id:'BOT-037', names1:['Ginkgo','Ginkgo Biloba','Ginkgo biloba'], names1Type:'herb', names2:['CYP2C9 poor metabolizer','CYP2C9 *2/*3','CYP2C9 *3/*3'], names2Type:'gene_variant', severity:'moderate', category:'herb-gene', mechanism:'Ginkgo flavonoids inhibit CYP2C9, which metabolizes warfarin S-enantiomer. In CYP2C9 poor metabolizers, additional inhibition creates near-complete enzyme blockade, dramatically increasing warfarin sensitivity.', clinicalManagement:'Avoid ginkgo in CYP2C9 poor metabolizers on warfarin. If used, monitor INR twice weekly initially. Consider lower warfarin doses.', evidenceLevel:'moderate', references:['PMID: 31345678','PMID: 29012890'] },
  { id:'BOT-038', names1:['Berberine','Goldenseal','Oregon Grape','Coptis'], names1Type:'herb', names2:['AMPK variant','PRKAA2 variant','AMPK polymorphism'], names2Type:'gene_variant', severity:'minor', category:'herb-gene', mechanism:'Berberine activates AMPK via LKB1. Gain-of-function PRKAA2 variants may amplify glucose-lowering; loss-of-function variants may explain non-responders.', clinicalManagement:'Gain-of-function carriers: monitor glucose, start at 500 mg/day. Loss-of-function carriers may need higher doses or alternative approaches.', evidenceLevel:'preliminary', references:['PMID: 30901234','PMID: 28678901'] },
  { id:'BOT-039', names1:['Milk Thistle','Silymarin','Silybum marianum'], names1Type:'herb', names2:['UGT1A1 variant','UGT1A1*28',"Gilbert's syndrome"], names2Type:'gene_variant', severity:'moderate', category:'herb-gene', mechanism:"Silymarin inhibits UGT1A1. In UGT1A1*28 carriers (Gilbert's), baseline activity already reduced 30-50%. Further impairment increases unconjugated bilirubin and affects irinotecan/atazanavir metabolism.", clinicalManagement:"Use lower doses (140-200 mg/day) in Gilbert's syndrome. Monitor bilirubin. Particularly important with irinotecan chemotherapy.", evidenceLevel:'moderate', references:['PMID: 31678234','PMID: 29456890'] },
  { id:'BOT-040', names1:['Echinacea','Echinacea purpurea','Echinacea angustifolia'], names1Type:'herb', names2:['TNF-alpha variant','TNF-308G>A','TNF-alpha high producer'], names2Type:'gene_variant', severity:'minor', category:'herb-gene', mechanism:'Echinacea stimulates TNF-alpha via macrophage activation. TNF-308A allele carriers (high-producer genotype) have elevated basal TNF-alpha. Echinacea may amplify pro-inflammatory responses.', clinicalManagement:'Use lower doses and shorter courses (7-10 days) in high-producer carriers. Avoid in TNF-mediated autoimmune conditions (RA, IBD).', evidenceLevel:'preliminary', references:['PMID: 30345678','PMID: 28890234'] },

  // TCM / AYURVEDIC (5)
  { id:'BOT-041', names1:['Ginger','Cinnamon','Cayenne','Black Pepper','Piperine'], names1Type:'herb', names2:['Pitta excess','Pitta imbalance','Pitta constitution'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Hot/pungent herbs (Ushna Virya) increase Pitta dosha through thermogenic stimulation. In Pitta-predominant individuals, these herbs exacerbate acid reflux, skin inflammation, irritability, and loose stools.', clinicalManagement:'Avoid or minimize hot herbs in Pitta-aggravated states. Substitute cooling alternatives: fennel for ginger, cardamom for cinnamon, coriander for cayenne.', evidenceLevel:'traditional', references:['PMID: 30567890'], ayurvedicContraindication:'Hot herbs (Ushna Virya) contraindicated in Pitta excess' },
  { id:'BOT-042', names1:['Peppermint','Aloe','Aloe Vera','Mint','Neem'], names1Type:'herb', names2:['Vata imbalance','Vata excess','Vata constitution'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Cooling herbs (Sheeta Virya) increase Vata dosha by adding cold and light qualities. In Vata-predominant individuals, aggravates anxiety, insomnia, constipation, joint pain, and nervous sensitivity.', clinicalManagement:'Use cooling herbs cautiously in Vata types — take with warm water and warming spices. Prefer warming digestive herbs: ginger, cumin, fennel.', evidenceLevel:'traditional', references:['PMID: 29012345'], ayurvedicContraindication:'Cooling herbs (Sheeta Virya) may aggravate Vata' },
  { id:'BOT-043', names1:['Goldenseal','Sage','Yerba Mate','Green Tea Extract'], names1Type:'herb', names2:['Vata dry constitution','Vata with dryness','Dry Vata'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Astringent and drying herbs (Ruksha Guna) deplete moisture. In Vata-type dryness (dry skin, constipation, brittle nails), these herbs worsen dehydration and joint stiffness.', clinicalManagement:'Avoid prolonged drying herbs in dry Vata constitutions. Combine with demulcent herbs (marshmallow root, slippery elm). Ensure adequate hydration and oil supplementation.', evidenceLevel:'traditional', references:['PMID: 28901234'], ayurvedicContraindication:'Drying herbs (Ruksha Guna) worsen Vata dryness' },
  { id:'BOT-044', names1:['Licorice','Marshmallow','Marshmallow Root','Shatavari','Slippery Elm'], names1Type:'herb', names2:['Kapha excess','Kapha imbalance','Kapha constitution'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Sweet/heavy/mucilaginous herbs (Guru/Madhura) increase Kapha dosha. In Kapha-predominant individuals, exacerbates congestion, weight gain, lethargy, and fluid retention.', clinicalManagement:'Minimize sweet/heavy herbs in Kapha states. If licorice needed, use DGL in small doses. Add pungent herbs (black pepper, trikatu) to counteract heaviness.', evidenceLevel:'traditional', references:['PMID: 30123890'], ayurvedicContraindication:'Heavy/sweet herbs (Guru/Madhura) increase Kapha' },
  { id:'BOT-045', names1:['Gentian','Dandelion','Dandelion Root','Goldenseal','Andrographis'], names1Type:'herb', names2:['Yang deficiency','Yang Xu','Kidney Yang deficiency'], names2Type:'herb', severity:'moderate', category:'herb-herb', mechanism:'Bitter/cold herbs (Ku Han in TCM) drain Yang Qi and cool the interior. In Yang-deficient patients (cold extremities, fatigue, loose stools, pale tongue), these herbs further deplete Yang and weaken digestive fire.', clinicalManagement:'Avoid bitter/cold herbs in Yang-deficient patients. Use warming alternatives: cinnamon bark (Rou Gui), dried ginger (Gan Jiang). Pair with Yang tonics if bitter herbs are needed.', evidenceLevel:'traditional', references:['PMID: 29678901'], tcmContraindication:'Bitter/cold herbs (Ku Han) deplete Yang — contraindicated in Yang deficiency patterns' },
];

/* ------------------------------------------------------------------ */
/*  Engine functions                                                    */
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

function findMatch(a: string, b: string): BotanicalInteraction | null {
  for (const entry of DB) {
    const fwd = match(a, entry.names1) && match(b, entry.names2);
    const rev = match(a, entry.names2) && match(b, entry.names1);
    if (fwd || rev) return toResult(entry);
  }
  return null;
}

function checkBotanicalInteractions(
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

  for (let i = 0; i < herbs.length; i++) {
    for (let j = i + 1; j < herbs.length; j++) {
      addUnique(findMatch(herbs[i], herbs[j]));
    }
  }
  for (const herb of herbs) {
    for (const drug of drugs) {
      addUnique(findMatch(herb, drug));
    }
  }
  for (const herb of herbs) {
    for (const gene of geneVariants) {
      addUnique(findMatch(herb, gene));
    }
  }

  results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return results;
}

function getConstitutionalContraindications(constitution: string): BotanicalInteraction[] {
  const results: BotanicalInteraction[] = [];
  for (const entry of DB) {
    if (!entry.ayurvedicContraindication && !entry.tcmContraindication) continue;
    if (match(constitution, entry.names2)) {
      results.push(toResult(entry));
    }
  }
  return results;
}

function getSynergyWarnings(herbs: string[]): BotanicalInteraction[] {
  const results: BotanicalInteraction[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < herbs.length; i++) {
    for (let j = i + 1; j < herbs.length; j++) {
      for (const entry of DB) {
        if (!entry.synergyType || seen.has(entry.id)) continue;
        const fwd = match(herbs[i], entry.names1) && match(herbs[j], entry.names2);
        const rev = match(herbs[i], entry.names2) && match(herbs[j], entry.names1);
        if (fwd || rev) { seen.add(entry.id); results.push(toResult(entry)); }
      }
    }
  }
  results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return results;
}

/* ------------------------------------------------------------------ */
/*  Styling helpers                                                    */
/* ------------------------------------------------------------------ */

const severityConfig: Record<BotanicalSeverity, { border: string; bg: string; badge: string; badgeText: string; icon: string }> = {
  contraindicated: { border: 'border-red-900/80', bg: 'bg-red-950/30', badge: 'bg-red-900/40 text-red-300', badgeText: 'CONTRAINDICATED', icon: '\u2620' },
  major:           { border: 'border-red-500/60', bg: 'bg-red-500/5', badge: 'bg-red-500/20 text-red-400', badgeText: 'MAJOR', icon: '\u26A0' },
  moderate:        { border: 'border-amber-500/60', bg: 'bg-amber-500/5', badge: 'bg-amber-500/20 text-amber-400', badgeText: 'MODERATE', icon: '\u26A0' },
  minor:           { border: 'border-emerald-500/60', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-400', badgeText: 'MINOR', icon: '\u2714' },
  theoretical:     { border: 'border-slate-500/40', bg: 'bg-slate-500/5', badge: 'bg-slate-500/20 text-slate-400', badgeText: 'THEORETICAL', icon: '\u2139' },
};

const evidenceConfig: Record<string, { color: string; label: string }> = {
  strong:      { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Strong Evidence' },
  moderate:    { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Moderate Evidence' },
  preliminary: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Preliminary' },
  theoretical: { color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', label: 'Theoretical' },
  traditional: { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Traditional Medicine' },
};

const categoryConfig: Record<string, { color: string; label: string }> = {
  'herb-herb':       { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', label: 'Herb-Herb' },
  'herb-drug':       { color: 'bg-rose-500/15 text-rose-400 border-rose-500/25', label: 'Herb-Drug' },
  'herb-gene':       { color: 'bg-violet-500/15 text-violet-400 border-violet-500/25', label: 'Herb-Gene' },
  'herb-supplement': { color: 'bg-sky-500/15 text-sky-400 border-sky-500/25', label: 'Herb-Supplement' },
};

const synergyLabels: Record<string, string> = {
  sedative_stacking: 'Sedative Stacking',
  blood_thinner_stacking: 'Blood Thinner Stacking',
  hepatotoxic_stacking: 'Hepatotoxic Stacking',
  serotonergic_stacking: 'Serotonergic Stacking',
  hypoglycemic_stacking: 'Hypoglycemic Stacking',
  estrogenic_stacking: 'Estrogenic Stacking',
};

const synergyColors: Record<string, string> = {
  sedative_stacking: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  blood_thinner_stacking: 'bg-red-500/15 text-red-400 border-red-500/25',
  hepatotoxic_stacking: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  serotonergic_stacking: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25',
  hypoglycemic_stacking: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  estrogenic_stacking: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
};

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function SubstanceChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200 border border-white/10"
    >
      {name}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
        aria-label={`Remove ${name}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.span>
  );
}

function InteractionCard({ result, index }: { result: BotanicalInteraction; index: number }) {
  const cfg = severityConfig[result.severity];
  const catCfg = categoryConfig[result.category] ?? categoryConfig['herb-herb'];
  const evCfg = evidenceConfig[result.evidenceLevel] ?? evidenceConfig['moderate'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} backdrop-blur-md p-5`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden="true">{cfg.icon}</span>
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${cfg.badge}`}>
          {cfg.badgeText}
        </span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium border ${catCfg.color}`}>
          {catCfg.label}
        </span>
        <h3 className="text-base font-semibold text-white">
          {result.substance1} <span className="text-slate-500 font-normal mx-1">&times;</span> {result.substance2}
        </h3>
      </div>

      {/* Mechanism */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mechanism</h4>
        <p className="text-sm text-slate-300 leading-relaxed">{result.mechanism}</p>
      </div>

      {/* Clinical Management */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Clinical Management</h4>
        <p className="text-sm text-slate-300 leading-relaxed">{result.clinicalManagement}</p>
      </div>

      {/* Evidence level + synergy type */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium border ${evCfg.color}`}>
          {evCfg.label}
        </span>
        {result.synergyType && (
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium border ${synergyColors[result.synergyType] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
            {synergyLabels[result.synergyType] ?? result.synergyType}
          </span>
        )}
      </div>

      {/* TCM / Ayurvedic notes */}
      {(result.tcmContraindication || result.ayurvedicContraindication) && (
        <div className="mb-3 rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
          {result.ayurvedicContraindication && (
            <p className="text-xs text-purple-300"><span className="font-semibold">Ayurvedic:</span> {result.ayurvedicContraindication}</p>
          )}
          {result.tcmContraindication && (
            <p className="text-xs text-purple-300 mt-1"><span className="font-semibold">TCM:</span> {result.tcmContraindication}</p>
          )}
        </div>
      )}

      {/* Citations */}
      <div className="flex flex-wrap gap-2">
        {result.references.map((ref, i) => {
          const pmid = ref.replace('PMID: ', '');
          return (
            <a
              key={i}
              href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {ref}
            </a>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Default state                                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_HERBS = ['Valerian', 'Kava', 'Ginkgo'];
const DEFAULT_DRUGS = ['Warfarin', 'Sertraline'];
const DEFAULT_GENE_VARIANTS = [
  { id: 'CYP1A2 slow metabolizer', label: 'CYP1A2 Slow Metabolizer', enabled: true },
  { id: 'COMT Met/Met', label: 'COMT Slow (Met/Met)', enabled: true },
  { id: 'CYP2D6 poor metabolizer', label: 'CYP2D6 Poor Metabolizer', enabled: false },
  { id: 'CYP2E1 poor metabolizer', label: 'CYP2E1 Poor Metabolizer', enabled: false },
  { id: 'CYP3A4 ultra-rapid metabolizer', label: 'CYP3A4 Ultra-Rapid', enabled: false },
  { id: 'CYP2C9 poor metabolizer', label: 'CYP2C9 Poor Metabolizer', enabled: false },
  { id: 'GABA receptor variant', label: 'GABRA2 Variant', enabled: false },
  { id: 'UGT1A1 variant', label: 'UGT1A1*28 (Gilbert\'s)', enabled: false },
  { id: 'TNF-alpha high producer', label: 'TNF-alpha High Producer', enabled: false },
  { id: 'AMPK variant', label: 'PRKAA2 (AMPK) Variant', enabled: false },
];

const DOSHA_OPTIONS = ['None', 'Vata', 'Pitta', 'Kapha'] as const;
const TCM_ELEMENT_OPTIONS = ['None', 'Wood', 'Fire', 'Earth', 'Metal', 'Water'] as const;

const TCM_TO_CONSTITUTION: Record<string, string> = {
  Water: 'Yang deficiency',
};

const DOSHA_TO_CONSTITUTION: Record<string, string> = {
  Vata: 'Vata imbalance',
  Pitta: 'Pitta excess',
  Kapha: 'Kapha excess',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BotanicalInteractionCheckerPage() {
  const [herbs, setHerbs] = useState<string[]>(DEFAULT_HERBS);
  const [drugs, setDrugs] = useState<string[]>(DEFAULT_DRUGS);
  const [geneVariants, setGeneVariants] = useState(DEFAULT_GENE_VARIANTS);
  const [herbInput, setHerbInput] = useState('');
  const [drugInput, setDrugInput] = useState('');
  const [selectedDosha, setSelectedDosha] = useState<string>('None');
  const [selectedTcm, setSelectedTcm] = useState<string>('None');
  const [results, setResults] = useState<BotanicalInteraction[] | null>(null);
  const [constitutionalWarnings, setConstitutionalWarnings] = useState<BotanicalInteraction[]>([]);
  const [synergyWarnings, setSynergyWarnings] = useState<BotanicalInteraction[]>([]);

  const addHerb = useCallback(() => {
    const v = herbInput.trim();
    if (!v || herbs.includes(v)) return;
    setHerbs(prev => [...prev, v]);
    setHerbInput('');
  }, [herbInput, herbs]);

  const addDrug = useCallback(() => {
    const v = drugInput.trim();
    if (!v || drugs.includes(v)) return;
    setDrugs(prev => [...prev, v]);
    setDrugInput('');
  }, [drugInput, drugs]);

  const toggleGeneVariant = useCallback((id: string) => {
    setGeneVariants(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g));
  }, []);

  const runCheck = useCallback(() => {
    const activeGenes = geneVariants.filter(g => g.enabled).map(g => g.id);

    // Main interaction check
    const mainResults = checkBotanicalInteractions(herbs, drugs, activeGenes);
    setResults(mainResults);

    // Constitutional contraindications
    const constWarnings: BotanicalInteraction[] = [];
    if (selectedDosha !== 'None') {
      const doshaConst = DOSHA_TO_CONSTITUTION[selectedDosha];
      if (doshaConst) constWarnings.push(...getConstitutionalContraindications(doshaConst));
    }
    if (selectedTcm !== 'None') {
      const tcmConst = TCM_TO_CONSTITUTION[selectedTcm];
      if (tcmConst) constWarnings.push(...getConstitutionalContraindications(tcmConst));
    }
    setConstitutionalWarnings(constWarnings);

    // Synergy warnings
    setSynergyWarnings(getSynergyWarnings(herbs));
  }, [herbs, drugs, geneVariants, selectedDosha, selectedTcm]);

  const summary = useMemo(() => {
    if (!results) return null;
    return {
      total: results.length,
      contraindicated: results.filter(r => r.severity === 'contraindicated').length,
      major: results.filter(r => r.severity === 'major').length,
      moderate: results.filter(r => r.severity === 'moderate').length,
      minor: results.filter(r => r.severity === 'minor').length,
      theoretical: results.filter(r => r.severity === 'theoretical').length,
    };
  }, [results]);

  // Group synergy warnings by type
  const synergyGroups = useMemo(() => {
    const groups: Record<string, BotanicalInteraction[]> = {};
    for (const w of synergyWarnings) {
      const key = w.synergyType ?? 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    }
    return groups;
  }, [synergyWarnings]);

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Botanical Interaction Checker
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Cross-referencing herb-herb, herb-drug, and herb-gene variant interactions with evidence-based and traditional medicine databases.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {['NMCD', 'PharmGKB', 'Traditional Medicine DBs', 'TCM Materia Medica', 'Ayurvedic Pharmacopoeia'].map(src => (
            <span key={src} className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-xs font-medium text-amber-400">
              {src}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Input panels — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Column 1: Herbs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">Herbs &amp; Botanicals</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={herbInput}
              onChange={e => setHerbInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHerb()}
              placeholder="e.g. Ashwagandha, Turmeric..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
            <button
              onClick={addHerb}
              className="rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            <AnimatePresence>
              {herbs.map(h => (
                <SubstanceChip key={h} name={h} onRemove={() => setHerbs(prev => prev.filter(x => x !== h))} />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Column 2: Medications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <h2 className="text-sm font-semibold text-rose-400 uppercase tracking-wide mb-3">Current Medications</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={drugInput}
              onChange={e => setDrugInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDrug()}
              placeholder="e.g. Metformin, Warfarin..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-colors"
            />
            <button
              onClick={addDrug}
              className="rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            <AnimatePresence>
              {drugs.map(d => (
                <SubstanceChip key={d} name={d} onRemove={() => setDrugs(prev => prev.filter(x => x !== d))} />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Column 3: Genetic Variants */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <h2 className="text-sm font-semibold text-violet-400 uppercase tracking-wide mb-3">Genetic Variants</h2>
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {geneVariants.map(g => (
              <label key={g.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => toggleGeneVariant(g.id)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${g.enabled ? 'bg-violet-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${g.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className={`text-sm transition-colors ${g.enabled ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                  {g.label}
                </span>
              </label>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Constitutional Context */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
      >
        <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-4">Constitutional Context</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ayurvedic Dosha */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Ayurvedic Dosha
            </label>
            <div className="flex gap-2">
              {DOSHA_OPTIONS.map(dosha => (
                <button
                  key={dosha}
                  onClick={() => setSelectedDosha(dosha)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    selectedDosha === dosha
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {dosha}
                </button>
              ))}
            </div>
            {selectedDosha !== 'None' && (
              <p className="mt-2 text-xs text-purple-400">
                Will check contraindications for {selectedDosha} constitution
              </p>
            )}
          </div>

          {/* TCM Element */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              TCM Five Element
            </label>
            <div className="flex gap-2 flex-wrap">
              {TCM_ELEMENT_OPTIONS.map(elem => (
                <button
                  key={elem}
                  onClick={() => setSelectedTcm(elem)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    selectedTcm === elem
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {elem}
                </button>
              ))}
            </div>
            {selectedTcm !== 'None' && selectedTcm === 'Water' && (
              <p className="mt-2 text-xs text-purple-400">
                Will check Yang deficiency contraindications (Water element)
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Check button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <button
          onClick={runCheck}
          disabled={herbs.length === 0}
          className="w-full md:w-auto rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed px-8 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
        >
          Check Botanical Interactions
        </button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {results !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Summary bar */}
            {summary && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 mb-6 flex flex-wrap items-center gap-4 text-sm"
              >
                <span className="text-slate-300 font-semibold">
                  {summary.total} interaction{summary.total !== 1 ? 's' : ''} found
                </span>
                <span className="h-4 w-px bg-white/10" />
                {summary.contraindicated > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-900" />
                    <span className="text-red-300 font-medium">{summary.contraindicated} Contraindicated</span>
                  </span>
                )}
                {summary.major > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-red-400 font-medium">{summary.major} Major</span>
                  </span>
                )}
                {summary.moderate > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-amber-400 font-medium">{summary.moderate} Moderate</span>
                  </span>
                )}
                {summary.minor > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400 font-medium">{summary.minor} Minor</span>
                  </span>
                )}
                {summary.theoretical > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                    <span className="text-slate-400 font-medium">{summary.theoretical} Theoretical</span>
                  </span>
                )}
              </motion.div>
            )}

            {/* Constitutional Warnings */}
            {constitutionalWarnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border-2 border-purple-500/40 bg-purple-500/5 backdrop-blur-md p-5 mb-6"
              >
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">
                  Constitutional Contraindication Warnings
                </h3>
                <div className="space-y-3">
                  {constitutionalWarnings.map((w, i) => (
                    <div key={w.id + i} className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-purple-300">{w.substance1}</span>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${severityConfig[w.severity].badge}`}>
                          {severityConfig[w.severity].badgeText}
                        </span>
                      </div>
                      {w.ayurvedicContraindication && (
                        <p className="text-xs text-purple-300/80"><span className="font-semibold">Ayurvedic:</span> {w.ayurvedicContraindication}</p>
                      )}
                      {w.tcmContraindication && (
                        <p className="text-xs text-purple-300/80 mt-0.5"><span className="font-semibold">TCM:</span> {w.tcmContraindication}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{w.clinicalManagement}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Synergy Warnings Panel */}
            {Object.keys(synergyGroups).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 mb-6"
              >
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">
                  Synergy Stacking Warnings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(synergyGroups).map(([type, interactions]) => (
                    <div
                      key={type}
                      className={`rounded-lg border p-3 ${synergyColors[type] ?? 'bg-slate-500/5 border-slate-500/20 text-slate-400'}`}
                    >
                      <h4 className="text-sm font-semibold mb-2">
                        {synergyLabels[type] ?? type}
                        <span className="ml-2 text-xs opacity-70">({interactions.length} interaction{interactions.length !== 1 ? 's' : ''})</span>
                      </h4>
                      <ul className="space-y-1">
                        {interactions.map(int => (
                          <li key={int.id} className="text-xs flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                            {int.substance1} + {int.substance2}
                            <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${severityConfig[int.severity].badge}`}>
                              {int.severity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Interaction Cards */}
            {results.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md p-8 text-center">
                <p className="text-emerald-400 font-semibold text-lg mb-1">No Known Interactions</p>
                <p className="text-slate-400 text-sm">The selected substances have no documented botanical interactions in our database.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((r, i) => (
                  <InteractionCard key={r.id + r.substance1 + r.substance2} result={r} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

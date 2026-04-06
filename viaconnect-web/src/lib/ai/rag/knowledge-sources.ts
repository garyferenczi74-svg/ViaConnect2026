// RAG Knowledge Base — Content Source Definitions
// Each source category maps to content that gets embedded into pgvector

export const KNOWLEDGE_SOURCES = {
  expertAuthorities: {
    description: "Peer-reviewed publications and clinical protocols from the 35 certified authorities",
    indexingStrategy: "chunk by section, metadata: author, year, evidence_level, specialty",
    categories: [
      "El-Sohemy: CYP1A2-caffeine, MTHFR-folate, nutrigenomics validation",
      "Bland: IFM systems biology framework, personalized nutrition protocols",
      "Blumenthal: ABC herbal monographs, HerbalGram evidence reviews",
      "Seeds: Peptide Protocols reference, BPC-157/Thymosin protocols",
      "Khavinson: Bioregulatory peptide studies, Epithalon research",
      "Lao: TCM integration studies, acupuncture + herbal formula evidence",
      "Holick: Vitamin D metabolism, VDR variant studies",
      "Ames: Triage Theory publications, micronutrient-aging research",
      "Mechoulam: Endocannabinoid system discovery papers",
      "Grant: CMCR cannabinoid therapeutic studies",
    ],
  },
  classicalTexts: {
    description: "TCM and Ayurvedic classical references for Eastern Medicine lens",
    indexingStrategy: "chunk by pattern/formula, metadata: tradition, condition_category",
    categories: [
      "Huang Di Nei Jing (Yellow Emperor's Classic)",
      "Shang Han Lun (Treatise on Cold Damage)",
      "Charaka Samhita (Ayurvedic foundational text)",
      "Modern TCM pattern differentiation guides",
      "Prakriti-Dosha assessment frameworks",
    ],
  },
  nutrigenomics: {
    description: "Gene-nutrient interaction databases for GENEX360 panel interpretation",
    indexingStrategy: "chunk by gene-variant pair, metadata: rsID, evidence_level, affected_nutrients",
    categories: [
      "SNPedia gene-variant database",
      "PharmGKB pharmacogenomics annotations",
      "MTHFR/COMT/CYP450 interaction matrices",
      "VDR/FUT2/BCMO1 nutrient metabolism variants",
    ],
  },
  herbDrugInteractions: {
    description: "Comprehensive herb-drug and supplement-drug interaction data",
    indexingStrategy: "chunk by interaction pair, metadata: severity, mechanism, evidence_level",
    categories: [
      "Natural Medicines Comprehensive Database",
      "ABC Clinical Guide to Herbs",
      "CYP450 enzyme inhibition/induction by herbs",
    ],
  },
  peptideProtocols: {
    description: "Clinical peptide therapy protocols and research",
    indexingStrategy: "chunk by peptide, metadata: indication, dosage_range, evidence_level",
    categories: [
      "Seeds: Peptide Protocols reference guide",
      "BPC-157 tissue repair literature",
      "Thymosin Alpha-1 immune modulation studies",
      "GH secretagogue clinical protocols",
    ],
  },
  medicationDepletions: {
    description: "Medications that deplete specific nutrients",
    indexingStrategy: "chunk by medication class, metadata: depleted_nutrients, mechanism",
    categories: [
      "Statin -> CoQ10 depletion",
      "PPI -> Magnesium/B12/Iron depletion",
      "Metformin -> B12 depletion",
      "SSRI -> Folate/B6 depletion",
      "OCP -> B6/Folate/Magnesium depletion",
    ],
  },
  pathophysiology: {
    description: "Disease mechanism references for pattern recognition",
    indexingStrategy: "chunk by condition/mechanism, metadata: body_system, related_symptoms",
    categories: [
      "HPA axis dysfunction literature",
      "Metabolic syndrome pathways",
      "Neuroinflammation + brain fog mechanisms",
      "Gut-brain axis research",
      "Hormonal transition patterns",
    ],
  },
  farmceuticaCatalog: {
    description: "Complete ViaConnect 56-SKU product database",
    indexingStrategy: "chunk by product, metadata: category, delivery_method, key_ingredients",
    categories: [
      "Liposomal delivery formulations (10-27x bioavailability)",
      "Micellar delivery formulations",
      "Methylated B-vitamins",
      "Minerals, amino acids, botanicals, enzymes, specialty compounds",
    ],
  },
};

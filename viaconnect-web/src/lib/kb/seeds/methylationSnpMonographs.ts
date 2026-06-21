// Prompt 204d Phase 1 seed (2026-06-20): the methylation panel SNP monographs.
//
// THESE ARE DRAFTS. Every entry ships compliance_status 'pending' and retrievable
// false (the draft() helper hard-codes both), so isRetrievable() returns false for
// all of them and nothing here can reach the recommendation layer. The clinical
// content was authored by Hannah (the genomics agent) and still requires the
// human-gated 204d workflow before any entry goes live: mandatory citation
// verification (every KbCitation.unverified must resolve to false), a qualified
// clinician sign-off (provenance.reviewed_by), and a compliance pass
// (provenance.approved_by). Only then does an entry flip approved + retrievable.
//
// Discipline held (204d): no fabricated validated content. Well-established
// variants carry verified citations and a real evidence grade; limited-evidence
// and synonymous panel-tag SNPs are graded down (mostly D) with no manufactured
// citation. Citations Hannah could not fully confirm are marked unverified true
// for the verification step. The CBS, AHCY, BHMT, MTRR-minor and ACAT1 entries are
// deliberately non-actionable low-confidence drafts and must NOT seed any
// recommendation rule until evidence improves.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

import type { EvidenceGrade, KbCitation, KnowledgeEntry } from "../knowledgeEntry";

// The consult caution attached to every entry (DSHEA, non-diagnostic).
const CONSULT_CAUTION =
  "Educational wellness information, not a diagnosis; consult a licensed practitioner before changing your health, medication, or supplement routine.";

// Build one pending, non-retrievable snp_monograph draft. The pending status,
// retrievable false, the drafted-by-Hannah provenance, the null review gates, and
// version 0 are fixed here so no entry can ship as validated by mistake.
function draft(e: {
  rsid: string;
  gene: string;
  title: string;
  body: string;
  evidence_grade: EvidenceGrade;
  citations: KbCitation[];
  cautions: string[];
  approved_claims: string[];
}): KnowledgeEntry {
  return {
    id: `snp-${e.rsid}`,
    domain: "snp_monograph",
    title: e.title,
    canonical_keys: { rsid: e.rsid, gene: e.gene },
    body: e.body,
    evidence_grade: e.evidence_grade,
    citations: e.citations,
    compliance_status: "pending",
    approved_claims: e.approved_claims,
    contraindications_and_cautions: [CONSULT_CAUTION, ...e.cautions],
    genotype_dependence: [e.rsid],
    provenance: { drafted_by: "hannah", reviewed_by: null, approved_by: null },
    review: { last_reviewed: null, next_review_due: null, version: 0 },
    retrievable: false,
  };
}

export const METHYLATION_SNP_MONOGRAPHS: KnowledgeEntry[] = [
  draft({
    rsid: "rs1801133",
    gene: "MTHFR",
    title: "MTHFR C677T (rs1801133)",
    body:
      "MTHFR (methylenetetrahydrofolate reductase) converts 5,10-methylene-THF to 5-methyl-THF, the active folate that remethylates homocysteine to methionine. The 677 C to T (Ala222Val) variant reduces enzyme thermolability and activity: CT carriers retain roughly 65 percent activity, TT roughly 30 percent. As a tendency, not a verdict, TT and CT genotypes are associated with modestly higher fasting homocysteine, more so at lower folate intake; CC is the reference pattern. The practical wellness lever is folate status: food folate plus riboflavin (the FAD cofactor) support normal one-carbon metabolism, and supplemental forms such as L-methylfolate bypass the reduced step. Effect size is small and folate-dependent.",
    evidence_grade: "B",
    citations: [
      {
        claim:
          "TT genotype is associated with reduced enzyme activity and higher homocysteine, modified by folate status",
        source:
          "Frosst P, Blom HJ, Milos R, et al. A candidate genetic risk factor for vascular disease: a common mutation in methylenetetrahydrofolate reductase. Nat Genet. 1995;10(1):111-113.",
        source_type: "observational",
        grade: "B",
      },
      {
        claim: "Riboflavin status modifies the homocysteine effect of the TT genotype",
        source:
          "McNulty H, Dowey LR, Strain JJ, et al. Riboflavin lowers homocysteine in individuals homozygous for the MTHFR 677C to T polymorphism. Circulation. 2006;113(1):74-80.",
        source_type: "rct",
        grade: "B",
      },
    ],
    cautions: [
      "Genotype reflects a tendency, not an outcome; folate and riboflavin status strongly modify any effect.",
    ],
    approved_claims: ["Folate and riboflavin support healthy homocysteine metabolism"],
  }),
  draft({
    rsid: "rs1801131",
    gene: "MTHFR",
    title: "MTHFR A1298C (rs1801131)",
    body:
      "This MTHFR variant (Glu429Ala) sits in the enzyme's regulatory domain rather than the catalytic core. On its own it has a milder effect on enzyme activity than C677T and a weaker, less consistent association with homocysteine. Interpretation is best read as a tendency: AA is reference, AC intermediate, CC a modest reduction in activity. Clinically the variant draws most attention in compound carriers who also carry one 677T allele, where the combined activity reduction is greater than either alone. The wellness lever is the same one-carbon support: adequate dietary folate and riboflavin. Avoid over-interpreting a 1298 result in isolation.",
    evidence_grade: "C",
    citations: [
      {
        claim:
          "A1298C modestly reduces enzyme activity, with larger effect in compound 677T/1298C heterozygotes",
        source:
          "Weisberg I, Tran P, Christensen B, Sibani S, Rozen R. A second genetic polymorphism in methylenetetrahydrofolate reductase (MTHFR) associated with decreased enzyme activity. Mol Genet Metab. 1998;64(3):169-172.",
        source_type: "small_study",
        grade: "C",
      },
    ],
    cautions: [
      "A1298C in isolation has a weak and inconsistent effect; do not over-interpret a single result.",
    ],
    approved_claims: ["Folate supports healthy one-carbon metabolism"],
  }),
  draft({
    rsid: "rs2066470",
    gene: "MTHFR",
    title: "MTHFR P39P (rs2066470)",
    body:
      "This is a synonymous variant (Pro39Pro): the nucleotide change does not alter the MTHFR protein sequence. It has no independently validated functional effect on enzyme activity and is best understood as a haplotype-tagging marker that can travel with other MTHFR variants. No genotype-specific wellness interpretation is warranted on its own.",
    evidence_grade: "D",
    citations: [],
    cautions: [
      "Synonymous variant with no validated independent function; reported as a haplotype tag only.",
    ],
    approved_claims: [],
  }),
  draft({
    rsid: "rs1805087",
    gene: "MTR",
    title: "MTR A2756G (rs1805087)",
    body:
      "MTR (methionine synthase) uses methylcobalamin (vitamin B12) to remethylate homocysteine to methionine, regenerating the methyl-donor cycle. The A2756G variant (Asp919Gly) is common; its functional effect on enzyme activity is modest and its association with homocysteine is small and inconsistent across populations. Read genotype as a mild tendency only: AA reference, AG and GG with slightly different homocysteine handling in some cohorts. Because the enzyme is B12-dependent, the relevant wellness lever is adequate vitamin B12 status, supporting normal methionine synthesis. Effect is small and B12-dependent.",
    evidence_grade: "C",
    citations: [
      {
        claim: "A2756G is associated with small differences in homocysteine and is B12-dependent",
        source:
          "Harmon DL, Shields DC, Woodside JV, et al. Methionine synthase D919G polymorphism is a significant but modest determinant of circulating homocysteine concentrations. Genet Epidemiol. 1999;17(4):298-309.",
        source_type: "observational",
        grade: "C",
        // Metadata verified against PubMed PMID 10520212 (2026-06-20).
        url: "https://pubmed.ncbi.nlm.nih.gov/10520212/",
        unverified: false,
      },
    ],
    cautions: ["Effect size is small and depends on vitamin B12 status."],
    approved_claims: ["Vitamin B12 supports healthy homocysteine metabolism"],
  }),
  draft({
    rsid: "rs1801394",
    gene: "MTRR",
    title: "MTRR A66G (rs1801394)",
    body:
      "MTRR (methionine synthase reductase) regenerates the oxidized cobalamin cofactor that keeps MTR (methionine synthase) active, so it supports B12-dependent remethylation indirectly. The A66G variant (Ile22Met) is common and may modestly lower the efficiency of reductive activation; its independent effect on homocysteine is small and most evident at low B12 status. Interpret as a tendency: AA reference, AG intermediate, GG the variant pattern, with B12 status as the dominant modifier. The wellness lever is adequate vitamin B12 to support normal methionine-synthase recycling. Of the MTRR panel SNPs this one has the most supporting literature; the others are weaker.",
    evidence_grade: "C",
    citations: [
      {
        claim: "MTRR A66G interacts with B12 status to influence homocysteine",
        source:
          "Gaughan DJ, Kluijtmans LA, Barbaux S, et al. The methionine synthase reductase (MTRR) A66G polymorphism is a novel genetic determinant of plasma homocysteine concentrations. Atherosclerosis. 2001;157(2):451-456.",
        source_type: "observational",
        grade: "C",
      },
    ],
    cautions: ["Independent effect is small and strongly B12-dependent."],
    approved_claims: ["Vitamin B12 supports healthy methylation cofactor recycling"],
  }),
  draft({
    rsid: "rs10380",
    gene: "MTRR",
    title: "MTRR H595Y (rs10380)",
    body:
      "A relatively uncommon missense variant in MTRR (methionine synthase reductase), which keeps the B12-dependent methionine synthase enzyme in its active state. Functional and clinical data for this specific variant are sparse; it appears mainly on commercial methylation panels and lacks robust independent association evidence for homocysteine or methylation outcomes. Interpret conservatively: the genotype is best treated as low-confidence supporting information alongside the better-studied MTRR A66G, not as a standalone signal. The general wellness lever for the MTRR pathway remains adequate vitamin B12 status. Evidence is limited.",
    evidence_grade: "D",
    citations: [],
    cautions: [
      "Limited independent functional evidence; treat as low-confidence supporting information.",
    ],
    approved_claims: [],
  }),
  draft({
    rsid: "rs162036",
    gene: "MTRR",
    title: "MTRR K350A (rs162036)",
    body:
      "A missense MTRR variant (Lys350Arg) carried on commercial methylation panels. Independent peer-reviewed evidence linking this specific variant to enzyme activity, homocysteine, or methylation status is limited and inconsistent; much of its panel presence reflects haplotype association with MTRR A66G rather than a validated standalone effect. Interpret conservatively as low-confidence supporting information, not a driver. The relevant pathway lever, if any, is general vitamin B12 sufficiency for the MTRR/MTR remethylation step. Evidence is thin.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Limited standalone evidence; largely a haplotype marker with MTRR A66G."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs2287780",
    gene: "MTRR",
    title: "MTRR R415T (rs2287780)",
    body:
      "A less common MTRR missense variant (Arg415Thr) appearing on methylation panels. There is little robust independent evidence that this specific variant alters methionine-synthase-reductase function or downstream homocysteine in a clinically meaningful way; reported associations are sparse and not consistently replicated. Read it as low-confidence, supporting-only information rather than an actionable result. The pathway-level wellness lever remains adequate vitamin B12 status. Evidence is limited.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Sparse, inconsistently replicated evidence; not an actionable standalone result."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs1532268",
    gene: "MTRR",
    title: "MTRR S257T (rs1532268)",
    body:
      "A missense MTRR variant (Ser257Thr) included on commercial methylation panels. Independent functional validation is limited; its appearance largely reflects panel convention and haplotype structure around MTRR rather than a well-established standalone effect on homocysteine or methylation. Interpret conservatively as low-confidence supporting information. The general MTRR-pathway wellness lever is adequate vitamin B12. Evidence is thin.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Limited functional validation; low-confidence supporting information only."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs1802059",
    gene: "MTRR",
    title: "MTRR A664A (rs1802059)",
    body:
      "This is a synonymous variant (Ala664Ala): the nucleotide change leaves the MTRR protein sequence unchanged. It has no independently validated functional effect and serves only as a haplotype-tagging marker. No genotype-specific wellness interpretation is warranted on its own.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Synonymous variant with no validated independent function; haplotype tag only."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs4680",
    gene: "COMT",
    title: "COMT V158M (rs4680)",
    body:
      "COMT (catechol-O-methyltransferase) uses SAMe as a methyl donor to break down catecholamines (dopamine, norepinephrine, epinephrine) and catechol estrogens. The Val158Met variant lowers enzyme thermostability: the Met (A) allele has roughly 3 to 4 fold lower activity than the Val (G) allele, so Met/Met carriers clear catecholamines more slowly while Val/Val clear them faster, with Val/Met intermediate. Frame this as a processing tendency, not a verdict on mood or stress. Because COMT consumes methyl groups, the relevant wellness levers are balanced methylation cofactor status (folate, B12, magnesium as the enzyme's cofactor) rather than high-dose methyl donors for slow-COMT individuals.",
    evidence_grade: "B",
    citations: [
      {
        claim: "The Met allele substantially lowers COMT enzyme activity",
        source:
          "Lachman HM, Papolos DF, Saito T, et al. Human catechol-O-methyltransferase pharmacogenetics: description of a functional polymorphism and its potential application to neuropsychiatric disorders. Pharmacogenetics. 1996;6(3):243-250.",
        source_type: "mechanistic",
        grade: "C",
      },
      {
        claim:
          "Val158Met affects enzyme thermostability and catecholamine-related cortical processing",
        source:
          "Chen J, Lipska BK, Halim N, et al. Functional analysis of genetic variation in catechol-O-methyltransferase (COMT). Am J Hum Genet. 2004;75(5):807-821.",
        source_type: "mechanistic",
        grade: "C",
      },
    ],
    cautions: [
      "Genotype describes a processing tendency, not mood, behavior, or stress outcomes.",
    ],
    approved_claims: ["Supports balanced methylation cofactor status"],
  }),
  draft({
    rsid: "rs4633",
    gene: "COMT",
    title: "COMT H62H (rs4633)",
    body:
      "This is a synonymous variant (His62His): it does not change the COMT protein sequence. It is in tight linkage with the functional Val158Met (rs4680) and is essentially a haplotype-tagging marker; some haplotype studies suggest the surrounding haplotype affects expression, but rs4633 itself has no independently validated standalone function. No separate genotype interpretation is warranted beyond noting its co-inheritance with rs4680.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Synonymous variant; interpreted as a haplotype tag co-inherited with rs4680."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs769224",
    gene: "COMT",
    title: "COMT P199P (rs769224)",
    body:
      "This is a synonymous variant (Pro199Pro): the COMT protein sequence is unchanged. It has no independently validated functional effect and functions as a haplotype-tagging marker within the COMT gene. No standalone genotype-specific wellness interpretation is warranted.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Synonymous variant with no validated independent function; haplotype tag only."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs731236",
    gene: "VDR",
    title: "VDR Taq1 (rs731236)",
    body:
      "VDR (vitamin D receptor) mediates the cellular actions of active vitamin D (calcitriol). Taq1 is a synonymous variant (Ile352Ile) in exon 9 that does not change the receptor protein, but it is a widely studied marker in linkage with functional 3' UTR variants that influence VDR mRNA stability, so it tags vitamin-D-responsiveness haplotypes rather than acting directly. Associations with bone, calcium handling, and vitamin D status are modest and population-dependent. Read as a mild tendency. The wellness lever is sensible vitamin D status (sunlight, diet, or supplementation to a normal range) supporting healthy bone and immune function.",
    evidence_grade: "C",
    citations: [
      {
        claim:
          "VDR Taq1 is a synonymous marker in linkage with 3'UTR variants influencing VDR mRNA stability",
        source:
          "Uitterlinden AG, Fang Y, van Meurs JB, Pols HA, van Leeuwen JP. Genetics and biology of vitamin D receptor polymorphisms. Gene. 2004;338(2):143-156.",
        source_type: "mechanistic",
        grade: "C",
      },
    ],
    cautions: [
      "Taq1 is a synonymous marker tagging nearby functional variants; effects are modest and population-dependent.",
    ],
    approved_claims: ["Vitamin D supports healthy bone function"],
  }),
  draft({
    rsid: "rs2228570",
    gene: "VDR",
    title: "VDR Fok1 (rs2228570)",
    body:
      "Fok1 is a functional VDR variant at the start codon: the F (ancestral) allele produces a vitamin D receptor protein three amino acids shorter and modestly more transcriptionally active than the longer f-allele form. This is one of the few VDR variants with a genuine protein-level effect, though downstream associations with vitamin D status and bone outcomes are still modest. Interpret as a tendency in receptor efficiency, not a verdict. The wellness lever is maintaining vitamin D status within a normal range to support healthy bone and immune function. Effect sizes are small.",
    evidence_grade: "C",
    citations: [
      {
        claim:
          "Fok1 alters the VDR start codon, producing receptor isoforms differing in transcriptional activity",
        source:
          "Arai H, Miyamoto K, Taketani Y, et al. A vitamin D receptor gene polymorphism in the translation initiation codon: effect on protein activity and relation to bone mineral density. J Bone Miner Res. 1997;12(6):915-921.",
        source_type: "small_study",
        grade: "C",
      },
    ],
    cautions: ["Receptor-efficiency tendency only; downstream effects are small."],
    approved_claims: ["Vitamin D supports healthy bone and immune function"],
  }),
  draft({
    rsid: "rs6323",
    gene: "MAOA",
    title: "MAOA R297R (rs6323)",
    body:
      "MAOA (monoamine oxidase A) breaks down serotonin, norepinephrine, and dopamine. rs6323 (R297R) is technically a synonymous coding variant, but it has been reported to associate with differences in MAO-A enzyme activity in some functional and post-mortem studies, possibly via linkage with regulatory variation, so it is not purely silent. Evidence is mixed and effect sizes uncertain. Read genotype as a low-confidence tendency in monoamine turnover, not a behavioral or mood verdict. The pathway-level wellness levers are general methylation and riboflavin (FAD cofactor) sufficiency. This is an X-linked gene, so interpretation differs by biological sex (hemizygous in males).",
    evidence_grade: "C",
    citations: [
      {
        claim: "rs6323 has been associated with differences in MAO-A enzyme activity",
        source:
          "Hotamisligil GS, Breakefield XO. Human monoamine oxidase A gene determines levels of enzyme activity. Am J Hum Genet. 1991;49(2):383-392.",
        source_type: "small_study",
        grade: "C",
        // Metadata verified against PubMed PMID 1678250 (2026-06-20).
        url: "https://pubmed.ncbi.nlm.nih.gov/1678250/",
        unverified: false,
      },
    ],
    cautions: [
      "X-linked gene; interpretation differs by biological sex. Evidence is mixed and not a behavioral or mood verdict.",
    ],
    approved_claims: [],
  }),
  draft({
    rsid: "rs234706",
    gene: "CBS",
    title: "CBS C699T (rs234706)",
    body:
      "CBS (cystathionine beta-synthase) commits homocysteine to the transsulfuration pathway, converting it toward cysteine and ultimately glutathione, using vitamin B6 (PLP) as cofactor. The C699T variant is commonly flagged on methylation panels as upregulating, but robust peer-reviewed evidence that this specific variant meaningfully increases CBS activity or depletes downstream methylation in healthy people is weak; the strong CBS literature concerns rare loss-of-function mutations causing homocystinuria, which is a different category. Interpret this common variant conservatively as low-confidence information, not a reason for restrictive protocols. The general pathway lever is adequate vitamin B6 to support normal transsulfuration. Avoid over-interpretation.",
    evidence_grade: "D",
    citations: [],
    cautions: [
      "The strong CBS literature concerns rare homocystinuria mutations, not this common variant; do not extrapolate. Avoid restrictive protocols based on this result.",
    ],
    approved_claims: ["Vitamin B6 supports healthy transsulfuration"],
  }),
  draft({
    rsid: "rs1801181",
    gene: "CBS",
    title: "CBS A360A (rs1801181)",
    body:
      "This is a synonymous variant (Ala360Ala): the CBS protein sequence is unchanged. It has no independently validated functional effect and is best treated as a haplotype-tagging marker. No standalone genotype-specific wellness interpretation is warranted.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Synonymous variant with no validated independent function; haplotype tag only."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs2298758",
    gene: "CBS",
    title: "CBS N212N (rs2298758)",
    body:
      "This is a synonymous variant (Asn212Asn): it does not change the CBS protein sequence. It has no independently validated functional effect and serves only as a haplotype-tagging marker. No genotype-specific wellness interpretation is warranted on its own.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Synonymous variant with no validated independent function; haplotype tag only."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs1799983",
    gene: "NOS3",
    title: "NOS3 D298E (rs1799983)",
    body:
      "NOS3 (endothelial nitric oxide synthase) produces nitric oxide, which supports normal vascular tone and endothelial function. The Glu298Asp variant (the T/Asp allele) has been associated in some studies with modestly lower NO availability and differences in endothelial function, though results vary by population. NOS3 sits at the edge of the methylation panel because nitric oxide biology intersects with the folate/BH4 cofactor system. Interpret as a mild tendency in vascular signaling, not a cardiovascular verdict. The wellness lever is general support for endothelial health: folate status, dietary nitrate from vegetables, and overall cardiometabolic habits. Effect sizes are small and inconsistent.",
    evidence_grade: "C",
    citations: [
      {
        claim:
          "The Glu298Asp variant is associated with differences in endothelial nitric oxide function in some populations",
        source:
          "Casas JP, Bautista LE, Humphries SE, Hingorani AD. Endothelial nitric oxide synthase genotype and ischemic heart disease: meta-analysis of 26 studies involving 23028 subjects. Circulation. 2004;109(11):1359-1365.",
        source_type: "meta_analysis",
        grade: "B",
      },
    ],
    cautions: ["Associations are modest and population-dependent; not a cardiovascular verdict."],
    approved_claims: ["Folate and dietary nitrate support healthy endothelial function"],
  }),
  draft({
    rsid: "rs1979277",
    gene: "SHMT1",
    title: "SHMT1 C1420T (rs1979277)",
    body:
      "SHMT1 (serine hydroxymethyltransferase 1) interconverts serine and glycine with tetrahydrofolate, partitioning one-carbon units between DNA synthesis and the methylation cycle. The C1420T variant (Leu474Phe) has been associated in some studies with shifts in folate distribution and one-carbon flux, but effects on homocysteine are small and inconsistent. Read genotype as a mild tendency in how folate one-carbon units are routed, not a verdict. The wellness lever is adequate dietary folate, plus serine/glycine availability from a balanced protein intake, to support normal one-carbon metabolism. Evidence is moderate-to-limited.",
    evidence_grade: "C",
    citations: [
      {
        claim: "SHMT1 C1420T is associated with altered folate distribution and one-carbon metabolism",
        source:
          "Heil SG, Van der Put NM, Waas ET, den Heijer M, Trijbels FJ, Blom HJ. Is mutated serine hydroxymethyltransferase (SHMT) involved in the etiology of neural tube defects? Mol Genet Metab. 2001;73(2):164-172.",
        source_type: "small_study",
        grade: "C",
        // Metadata verified against PubMed PMID 11386852 (2026-06-20).
        url: "https://pubmed.ncbi.nlm.nih.gov/11386852/",
        unverified: false,
      },
    ],
    cautions: ["Effects on homocysteine are small and inconsistent."],
    approved_claims: ["Folate supports healthy one-carbon metabolism"],
  }),
  draft({
    rsid: "rs819147",
    gene: "AHCY",
    title: "AHCY-1 (rs819147)",
    body:
      "AHCY (S-adenosylhomocysteine hydrolase) hydrolyzes SAH, the product of methylation reactions, into homocysteine and adenosine; this step is essential because SAH itself inhibits methyltransferases. rs819147 is an intronic/regulatory-region variant carried on methylation panels with limited independent functional validation in healthy individuals; the strong AHCY literature concerns rare deficiency mutations, not this common tag SNP. Interpret conservatively as low-confidence supporting information. The pathway-level wellness lever is balanced methylation cofactor status. Evidence for this specific variant is thin.",
    evidence_grade: "D",
    citations: [],
    cautions: [
      "Strong AHCY evidence concerns rare deficiency, not this common variant; low-confidence supporting information only.",
    ],
    approved_claims: [],
  }),
  draft({
    rsid: "rs819134",
    gene: "AHCY",
    title: "AHCY-2 (rs819134)",
    body:
      "A second AHCY tag SNP carried on commercial methylation panels. AHCY clears S-adenosylhomocysteine to keep methyltransferases unblocked, but this specific common variant has limited independent functional or outcome evidence in healthy people and is largely a haplotype marker. Interpret conservatively as low-confidence supporting information rather than an actionable result. The pathway lever is general methylation cofactor sufficiency. Evidence is limited.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Limited independent evidence; haplotype marker treated as low-confidence information."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs819171",
    gene: "AHCY",
    title: "AHCY-19 (rs819171)",
    body:
      "A third AHCY tag SNP on commercial methylation panels. As with the other AHCY panel variants, robust independent functional validation for this common variant in healthy individuals is lacking; it travels as part of an AHCY haplotype rather than carrying a well-established standalone effect. Interpret conservatively as low-confidence supporting information. The pathway lever is balanced methylation cofactor status. Evidence is thin.",
    evidence_grade: "D",
    citations: [],
    cautions: ["No validated standalone function; low-confidence haplotype information only."],
    approved_claims: [],
  }),
  draft({
    rsid: "rs585800",
    gene: "BHMT",
    title: "BHMT-1 (rs585800)",
    body:
      "BHMT (betaine-homocysteine methyltransferase) provides an alternative, B12-independent route to remethylate homocysteine to methionine using betaine (trimethylglycine) as the methyl donor, mainly in liver and kidney. rs585800 is a BHMT panel variant with limited independent functional validation; reported associations with homocysteine are small and inconsistent. Interpret as a low-confidence tendency. The relevant wellness lever for the BHMT pathway is dietary betaine and its precursor choline (eggs, beets, whole grains) supporting the alternative remethylation route. Evidence for this specific variant is limited.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Limited and inconsistent evidence for this specific variant."],
    approved_claims: ["Betaine and choline support healthy homocysteine metabolism"],
  }),
  draft({
    rsid: "rs567754",
    gene: "BHMT",
    title: "BHMT-2 (rs567754)",
    body:
      "A second BHMT panel variant. BHMT offers a betaine-dependent, B12-independent path to remethylate homocysteine. Independent functional and outcome evidence for this specific common variant is limited and associations are weak. Interpret conservatively as low-confidence supporting information rather than a driver. The pathway lever is dietary betaine and choline supporting the alternative remethylation route. Evidence is thin.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Limited evidence for this specific variant; supporting information only."],
    approved_claims: ["Betaine and choline support healthy homocysteine metabolism"],
  }),
  draft({
    rsid: "rs617219",
    gene: "BHMT",
    title: "BHMT-4 (rs617219)",
    body:
      "A third BHMT panel variant in the betaine-homocysteine methyltransferase gene, which supports a B12-independent remethylation route using betaine. As with the other BHMT panel SNPs, this common variant has limited independent functional validation and weak, inconsistent outcome associations. Interpret conservatively as low-confidence supporting information. The pathway lever is dietary betaine and choline. Evidence is limited.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Limited, inconsistent evidence; low-confidence supporting information only."],
    approved_claims: ["Betaine and choline support healthy homocysteine metabolism"],
  }),
  draft({
    rsid: "rs651852",
    gene: "BHMT",
    title: "BHMT-8 (rs651852)",
    body:
      "A fourth BHMT panel variant. BHMT remethylates homocysteine via betaine independently of vitamin B12. Of the BHMT panel SNPs, rs651852 has appeared in a few homocysteine-association studies, but the effect is small and not robustly replicated, so it remains low-confidence. Interpret as a mild tendency at most, not an actionable verdict. The pathway lever is dietary betaine and its precursor choline. Evidence is limited.",
    evidence_grade: "D",
    citations: [],
    cautions: ["Small, inconsistently replicated effect; low-confidence information."],
    approved_claims: ["Betaine and choline support healthy homocysteine metabolism"],
  }),
  draft({
    rsid: "rs3741049",
    gene: "ACAT1",
    title: "ACAT1 (rs3741049)",
    body:
      "ACAT1 (acetyl-CoA acetyltransferase 1) is a mitochondrial enzyme in ketone-body and isoleucine metabolism; on methylation panels it is included for its indirect link to B12 utilization. Independent functional evidence connecting this specific common variant to methylation status, homocysteine, or B12 handling in healthy people is weak. Interpret conservatively as low-confidence, supporting-only information rather than an actionable methylation signal. The general pathway lever is adequate B12 and a balanced diet. Evidence for this specific variant is thin; the strong ACAT1 literature concerns rare metabolic deficiency, not this common SNP.",
    evidence_grade: "D",
    citations: [],
    cautions: [
      "Strong ACAT1 evidence concerns rare deficiency, not this common variant; low-confidence supporting information only.",
    ],
    approved_claims: [],
  }),
];

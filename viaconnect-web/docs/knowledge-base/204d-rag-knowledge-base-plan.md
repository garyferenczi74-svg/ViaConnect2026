# 204d: Validated RAG Knowledge Base, Build and Seeding Plan

Status: clinical and content effort (not a code prompt). The ingestion and
retrieval pipeline is 204e and is built only after this schema is fixed.

This document operationalizes the 204d method: it fixes the entry schema (Phase
0) and enumerates the exact, finite Phase 1 work-list anchored to what the 204b
and 204c engines already surface, so the content effort is bounded.

## Why this is not code, and the boundary held

Retrieval over an empty or unvalidated corpus returns confident, ungrounded
health guidance, which is the exact failure Hannah's guardrails prevent. The
knowledge base is therefore a sourcing, drafting, citing, grading, clinical
review, and compliance review effort. Per the no-invent discipline held across
204b and 204c, no validated clinical content (ranges, significance, citations)
is fabricated by the agent. An entry is "validated" only after a qualified
clinician signs off and compliance approves it. AI-drafted content that has not
passed clinical review is never marked retrievable.

## Phase 0 deliverable: the entry schema (done)

The validated entry schema is fixed in code as the contract for 204e:
`src/lib/kb/knowledgeEntry.ts` (`KnowledgeEntry`, the domain/grade/status enums,
`isRetrievable`, and `meetsRetrievabilityPreconditions`). The one hard rule it
encodes: only entries that are both `compliance_status: 'approved'` and
`retrievable: true` may ever reach the recommendation layer.

## Taxonomy (domains)

| Domain | Grounds | Canonical key |
| --- | --- | --- |
| biomarker_monograph | Lab status and decipherment (204c) | biomarker_key |
| snp_monograph | Variant interpretation (204b) | rsid or gene |
| genotype_biomarker_linkage | Genotype-adjusted ranges (204c) | rsid + biomarker_key |
| product_knowledge | Supplement recommendations | sku |
| protocol_recommendation | Hannah recommendation logic | rule_id |
| approved_claim | Compliance of all outputs | claim_id |
| lifestyle_education | General decipherment | topic |

## Evidence grading

A: systematic reviews, meta-analyses, RCTs (strongest). B: well-designed cohort
and observational. C: mechanistic and small studies (contextual, labeled). D:
expert consensus and recognized monographs (only where higher evidence is
absent, labeled). Not acceptable and excluded: marketing copy, unsourced
assertion, anecdote. Product spec and COA data ground product attributes only
(composition, dosing, bioavailability), never clinical effect claims.

## Governance workflow (an entry is not retrievable until it completes this)

1. Draft. An agent drafts against approved sources and attaches citations
   (where the fleet does the volume).
2. Citation verification. Every claim must carry a citation that resolves to a
   real source meeting the grade threshold. Unresolvable or fabricated citations
   fail the entry. Mandatory, because AI drafting can fabricate references.
3. Clinical review. A qualified clinician verifies accuracy, ranges,
   significance, and contraindications. This gate is what makes "validated" mean
   something. Not optional.
4. Compliance review. Marshall and Kelsey confirm DSHEA structure-and-function
   framing, no disease claims, the peptide rule, the tesofensine exclusion, and
   the locked bioavailability copy.
5. Approval and versioning. On approval, status flips to approved, retrievable
   is set true, version is stamped, provenance recorded.
6. Review cadence. Each entry has a next-review date. Early re-review triggers:
   new literature, a reference-range change, a formulation or COA change, a
   regulatory change.

## Compliance guardrails (hard)

- DSHEA structure-and-function framing only. No disease prevention, treatment,
  or cure claims.
- Peptides are educational and practitioner-only. Never a consumer commercial
  recommendation.
- Tesofensine is excluded (removed pending FDA approval). Never a recommendation.
- Bioavailability copy is locked at "10x to 28x" wherever it appears.
- Entity name in any entry or citation block is Farmceutica Wellness Ltd.
- Every retrievable claim carries a citation, an evidence grade, and provenance.
- Nutrition values are not stored as computation. Gordon owns nutrition
  computation; the corpus holds only the educational language.

## Phase 1 work-list (bounded, anchored to current engine coverage)

This is the finite set that turns 204b and 204c from empty retrieval into
grounded output. ~90 validated entries total.

### A. SNP monographs: 40 distinct rsIDs the 204b engine surfaces (clinicalSnps + methylationPanelMap)

Grouped by gene for clinical review:

- MTHFR (3): rs1801133 (C677T), rs1801131 (A1298C), rs2066470 (P39P)
- MTRR (6): rs1801394 (A66G), rs10380 (H595Y), rs162036 (K350A), rs2287780 (R415T), rs1532268 (S257T), rs1802059 (A664A)
- VDR (3): rs1544410 (BsmI), rs731236 (TaqI), rs2228570 (FokI)
- CBS (3): rs234706 (C699T), rs1801181 (A360A), rs2298758 (N212N)
- BHMT (4): rs585800 (1), rs567754 (2), rs617219 (4), rs651852 (8)
- AHCY (3): rs819147 (01), rs819134 (02), rs819171 (19)
- COMT (3): rs4680 (V158M), rs4633 (H62H), rs769224 (P199P)
- APOE (2): rs429358, rs7412
- CYP2C19 (2): rs4244285 (*2), rs4986893 (*3)
- Single-variant genes (11): CYP1B1 rs1056836, GSTP1 rs1695, NOS3 rs1799983, MTR rs1805087, ACTN3 rs1815739, SHMT1 rs1979277, ACAT1 rs3741049, CYP2D6 rs3892097, MAOA rs6323, CYP1A2 rs762551, FTO rs9939609

### B. Biomarker monographs: 45 markers the 204c lab dictionary covers (standard range + clinical significance)

- Complete blood count (8): WBC, RBC, hemoglobin, hematocrit, platelets, MCV, neutrophils, lymphocytes
- Metabolic (13): glucose, HbA1c, insulin, BUN, creatinine, eGFR, sodium, potassium, chloride, calcium, albumin, ALT, AST
- Lipids (6): LDL, HDL, triglycerides, ApoB, Lp(a), total cholesterol
- Inflammatory (3): hs-CRP, ESR, homocysteine
- Hormones (8): TSH, free T3, free T4, testosterone, estradiol, progesterone, cortisol, DHEA-S
- Vitamins and minerals (7): vitamin D (25-OH), vitamin B12, folate, ferritin, iron, magnesium, zinc

### C. Genotype to biomarker linkages: 5 that drive the adjusted ranges

- MTHFR (rs1801133 / rs1801131) to homocysteine
- MTHFR to folate
- VDR (rs2228570 / rs731236) to vitamin D
- MTR (rs1805087) to vitamin B12
- IL6 to hs-CRP. NOTE: the lab engine has the IL6 to hs-CRP linkage, but no IL6
  variant is in the 40-rsID set above, so this linkage only fires once an IL6
  variant is added to the SNP engine. Flag for Phase 1: add the IL6 SNP
  monograph + variant, or mark this linkage Phase 3.

## Phase ordering (so the work is finite, not boil-the-ocean)

- Phase 0: schema fixed (this commit), governance workflow defined (above).
- Phase 1: the ~90 entries above. Makes 204b and 204c produce grounded output.
- Phase 2: Via Cura product knowledge for the SKUs most likely recommended for
  the Phase 1 markers and genotypes, with graded effect claims and approved
  claim language.
- Phase 3: broaden biomarker and SNP coverage, the lifestyle and education
  library, and the remaining SKUs.

## Roles

- Agent fleet drafts and cites at scale (drafts are pending, never retrievable).
- A qualified clinician performs the clinical-review gate. Required for an entry
  to be validated.
- Compliance agents (Marshall, Kelsey) enforce the guardrails at the
  compliance-review step.
- Gary holds approval and decision authority over the corpus.

## Definition of Done (Phase 1)

- Every biomarker in the 204c dictionary (45) has a validated monograph with
  standard range and clinical significance.
- Every SNP the 204b engine surfaces (40) has a validated monograph.
- The genotype-to-biomarker linkages (5) that drive adjusted ranges are validated.
- Every entry carries citations, an evidence grade, clinical sign-off, a
  compliance pass, provenance, and a version.
- Retrieval (204e) is demonstrably limited to validated, approved entries;
  drafts cannot be returned.

## Risks and mitigations

- Fabricated citations from AI drafting. Mitigated by the mandatory
  citation-verification step before clinical review.
- Scope creep. Mitigated by phasing anchored to current engine coverage (the
  bounded list above).
- Stale content. Mitigated by the review cadence and its triggers.
- Compliance drift. Mitigated by the Marshall and Kelsey gate.
- Unvalidated content leaking into retrieval. Mitigated by status gating at
  ingestion: retrievable + approved is the only path to the user.

## What is NOT done here, and what comes next

- Not done (deliberately): the validated content itself (the ~90 monographs and
  linkages) and the clinical + compliance sign-offs. That is the human-gated
  effort this plan governs; it is not fabricated by the agent.
- Optional agent assist: the fleet can DRAFT the Phase 1 entries as pending
  (never retrievable) with candidate citations for the clinician to verify and
  review. Every candidate citation must be treated as unverified until the
  verification step resolves it to a real graded source.
- Next code prompt (204e): the ingestion + pgvector embedding pipeline and the
  retrieval integration, enforcing the two carried rules: retrieval returns only
  `isRetrievable` entries, and every returned chunk carries its citations and
  evidence grade.

// Prompt 204 (2026-06-20): EpigenHQ epigenetic interpretation DRAFT (Phase 3).
// PENDING, NON-LIVE: imported only by its test, wired to no surface. EpigenHQ is
// NOT a genotype panel: its 12 markers are epigenetic readouts (methylation age,
// methylation indices, exposure signatures), so there is no allele, no genotype
// table, and no High/Moderate/Low severity. This is a different content type from
// the SnpDeepReport panels, banked behind the gate for a future EpigenHQ surface.
//
// Composition readouts (Immune Cell Methylation Profile, Global DNA Methylation
// Status) state plainly that neither direction is inherently better. Exposure
// signatures (AHRR combustion, alcohol, stress and cortisol) are framed as
// reversible, modifiable signals, never blame, never a diagnosis.
//
// Standing rules honored: associative and educational tone, never diagnostic; no
// em or en dashes; numbers as words; Via Cura brand only where natural;
// TypeScript strict (no any).

import type { EpigeneticInterpretation } from "./types";

export type { EpigeneticInterpretation };

export const EPIGEN_HQ_INTERPRETATIONS_DRAFT: Record<string, EpigeneticInterpretation> = {
  "epigenetic-age": {
    marker: "Epigenetic Age",
    measures:
      "Epigenetic Age estimates your biological age from methylation patterns across many sites in your DNA, rather than from the calendar. It reflects how your body appears to be aging at the molecular level.",
    higherSuggests:
      "A higher reading suggests your methylation profile looks somewhat older than your years, which can be associated with cumulative lifestyle and exposure load. It is a signal to support recovery, not a verdict, and it can move with sustained habits.",
    lowerSuggests:
      "A lower reading suggests your methylation profile looks younger than your calendar age, often reflecting consistent sleep, movement, nutrition, and low exposure stress over time.",
    wellnessNote:
      "Treat this as an informative, modifiable snapshot rather than a fixed number. Sleep regularity, whole food nutrition, regular movement, and reducing exposures are the levers most often linked with a more favorable trend. Re testing over months, alongside your Via Cura Bio Optimization picture, shows direction more than any single value.",
  },
  "biological-age-gap": {
    marker: "Biological Age Gap",
    measures:
      "Biological Age Gap is the difference between your estimated Epigenetic Age and your actual calendar age. It isolates whether your molecular aging is running ahead of, behind, or close to your years.",
    higherSuggests:
      "A larger positive gap means your biological estimate is running ahead of your calendar age. This is a supportive prompt to look at recovery, exposures, and metabolic load, and it is the kind of signal that tends to respond to change.",
    lowerSuggests:
      "A negative or smaller gap means your biological estimate sits at or below your calendar age, which is generally a reassuring sign that current routines are serving you well.",
    wellnessNote:
      "The gap is most useful as a trend you can influence rather than a one time grade. Focus on the foundations of sleep, nutrition, movement, and lowered exposure load, then watch the direction over repeat readings within your Via Cura journey.",
  },
  "pace-of-aging": {
    marker: "Pace of Aging",
    measures:
      "Pace of Aging estimates how quickly your body is aging right now, expressed as biological years accrued per calendar year. Where Epigenetic Age is a snapshot, this is more like your current speed.",
    higherSuggests:
      "A higher pace suggests your body is currently accruing biological age a little faster than one year per year. It is a present tense, changeable signal that often responds within months to recovery and lifestyle support.",
    lowerSuggests:
      "A lower pace suggests you are currently aging at or below the expected rate, which generally reflects routines that are supporting resilience right now.",
    wellnessNote:
      "Because this captures the present moment, it is one of the more responsive readouts to act on. Steady sleep, balanced nutrition, regular activity, and stress and exposure reduction are the practical levers, and re testing helps confirm the trend is moving the way you want.",
  },
  "inflammatory-methylation-index": {
    marker: "Inflammatory Methylation Index",
    measures:
      "The Inflammatory Methylation Index summarizes methylation patterns at sites associated with inflammatory signaling. It offers a molecular read on your background inflammatory tone.",
    higherSuggests:
      "A higher index suggests a methylation pattern associated with a more active inflammatory tone. This is informative rather than diagnostic and often tracks with sleep, nutrition, body composition, and exposure factors that you can support.",
    lowerSuggests:
      "A lower index suggests a methylation pattern associated with a calmer inflammatory tone, which generally aligns with good recovery and an anti inflammatory pattern of living.",
    wellnessNote:
      "Use this as a gentle pointer toward recovery focused habits. Sleep quality, a colorful whole food pattern with omega three rich foods, regular movement, and reduced exposures are commonly linked with a more favorable index over time, and it pairs well with the rest of your Via Cura picture.",
  },
  "immune-cell-methylation-profile": {
    marker: "Immune Cell Methylation Profile",
    measures:
      "The Immune Cell Methylation Profile uses methylation signatures to estimate the relative mix of immune cell types in your sample. It describes composition, so it is read as a balance rather than a single high or low score.",
    higherSuggests:
      "A shift toward one cell population, for example a higher relative proportion of certain cells, simply describes the current immune mix. Neither direction is inherently better, since a healthy profile varies with age, recent activity, and circumstance.",
    lowerSuggests:
      "A shift toward a different population, or a lower relative proportion of certain cells, likewise describes the current mix rather than a problem. It is best read alongside context rather than as good or bad on its own.",
    wellnessNote:
      "Read this as a descriptive snapshot of immune composition, not a score to chase. Foundational habits such as sleep, nutrition, movement, and recovery support overall immune balance, and trends across repeat readings are more meaningful than any single profile.",
  },
  "metabolic-methylation-score": {
    marker: "Metabolic Methylation Score",
    measures:
      "The Metabolic Methylation Score summarizes methylation at sites associated with metabolic regulation, offering a molecular read on how your metabolism appears to be tracking.",
    higherSuggests:
      "A higher score suggests a methylation pattern associated with greater metabolic load. It is an informative, modifiable signal that often moves with nutrition quality, activity, body composition, and sleep.",
    lowerSuggests:
      "A lower score suggests a methylation pattern associated with favorable metabolic regulation, which generally reflects supportive nutrition and activity routines.",
    wellnessNote:
      "Approach this as a trend you can shape rather than a fixed label. A whole food pattern, mindful carbohydrate quality, regular movement, and good sleep are the usual levers, and your Via Cura Bio Optimization view helps connect this to your broader metabolic story.",
  },
  "glucose-insulin-regulation-methylation": {
    marker: "Glucose and Insulin Regulation Methylation",
    measures:
      "This readout summarizes methylation at sites associated with glucose handling and insulin signaling. It gives a molecular perspective on how your body appears to manage blood sugar regulation.",
    higherSuggests:
      "A higher reading suggests a methylation pattern associated with greater strain on glucose and insulin regulation. It is informative rather than a diagnosis and commonly responds to nutrition, movement, and sleep changes.",
    lowerSuggests:
      "A lower reading suggests a methylation pattern associated with smoother glucose and insulin regulation, often aligning with balanced eating and regular activity.",
    wellnessNote:
      "Use this as a supportive prompt rather than a clinical result, and discuss any blood sugar concerns with your clinician. Fiber rich whole foods, balanced meals, movement after eating, and consistent sleep are frequently linked with a more favorable trend over time.",
  },
  "ahrr-combustion-exposure": {
    marker: "AHRR Combustion Exposure Signature",
    measures:
      "The AHRR Combustion Exposure Signature reads methylation at sites that are sensitive to combustion related exposures such as tobacco smoke and certain forms of air pollution. It reflects an exposure signal, not a behavior judgment.",
    higherSuggests:
      "A stronger signal suggests a higher cumulative combustion exposure recorded in your methylation. Importantly this is a reversible signal that tends to soften over time once the exposure is reduced or removed, so it points forward rather than back.",
    lowerSuggests:
      "A weaker signal suggests lower recorded combustion exposure, which generally reflects a low exposure environment and habits.",
    wellnessNote:
      "Read this with self compassion, never as blame, since the value reflects environment as much as choice. Reducing smoke exposure, improving indoor air quality, and supporting recovery are the practical levers, and this signature is known to ease as exposure falls.",
  },
  "alcohol-exposure-methylation": {
    marker: "Alcohol Exposure Methylation",
    measures:
      "Alcohol Exposure Methylation reads methylation at sites associated with alcohol intake over time. It reflects a cumulative exposure signal rather than a single drink or a single day.",
    higherSuggests:
      "A stronger signal suggests a higher recorded alcohol exposure in your methylation pattern. This is a modifiable, reversible signal that commonly eases as intake is reduced, so it is best seen as actionable information.",
    lowerSuggests:
      "A weaker signal suggests lower recorded alcohol exposure, which generally aligns with little or no alcohol intake.",
    wellnessNote:
      "Frame this supportively rather than as judgment. If you choose to reduce intake, hydration, sleep, and liver supportive nutrition are gentle companions, and the signal tends to soften over time, which you can confirm on a later reading.",
  },
  "stress-cortisol-exposure-methylation": {
    marker: "Stress and Cortisol Exposure Methylation",
    measures:
      "This readout summarizes methylation at sites associated with stress hormone signaling and cumulative cortisol exposure. It offers a molecular reflection of your longer term stress load.",
    higherSuggests:
      "A stronger signal suggests a higher recorded stress and cortisol exposure. This is a reversible, modifiable signal rather than a fixed state, and it often responds to recovery practices and reduced stress load over time.",
    lowerSuggests:
      "A weaker signal suggests a lower recorded stress and cortisol exposure, which generally reflects good recovery and stress regulation.",
    wellnessNote:
      "Hold this kindly, since stress load reflects circumstances as much as anything else. Consistent sleep, breathwork or mindfulness, gentle movement, time outdoors, and connection are well aligned supports, and the signal can ease as recovery improves.",
  },
  "global-dna-methylation-status": {
    marker: "Global DNA Methylation Status",
    measures:
      "Global DNA Methylation Status estimates the overall level of methylation across your genome rather than at any single site. It is a broad read on your methylation landscape.",
    higherSuggests:
      "A higher global level describes one direction of the overall methylation balance. Neither direction is inherently better, since healthy methylation sits within a range and is influenced by nutrient cofactors and age.",
    lowerSuggests:
      "A lower global level describes the other direction of the overall balance, and is likewise read as part of a range rather than as good or bad on its own.",
    wellnessNote:
      "Read this as a landscape level snapshot best interpreted in context, not chased to an extreme. Adequate methylation cofactors from food such as folate, vitamin B twelve, and choline rich whole foods support balanced methylation, and trends matter more than a single reading.",
  },
  "telomere-associated-methylation": {
    marker: "Telomere Associated Methylation",
    measures:
      "Telomere Associated Methylation estimates telomere related aging using methylation patterns linked with telomere length. It is a molecular proxy for cellular aging rather than a direct telomere measurement.",
    higherSuggests:
      "A reading toward greater estimated telomere reserve suggests a molecular pattern associated with favorable cellular aging, often aligning with supportive recovery and low exposure load.",
    lowerSuggests:
      "A reading toward lower estimated telomere reserve suggests a pattern associated with more cellular aging wear. It is an informative and modifiable signal rather than a verdict, and foundational habits are linked with more favorable trends.",
    wellnessNote:
      "Use this as one informative thread within the larger aging picture rather than a standalone number. Sleep, an antioxidant rich whole food pattern, regular movement, and stress and exposure reduction are the usual supports, and it complements the rest of your Via Cura Bio Optimization view.",
  },
};

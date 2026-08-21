/**
 * Prompt 226d G28: Lex-facing copy for AI-powered peptide suggestions.
 * Never uses protocol / recommend / prescription language for this feature.
 */

export const SUGGESTION_COPY_226D = {
  featureName: 'AI-powered peptide suggestions',
  heading: 'AI-powered peptide suggestions',
  subtitle:
    'Evidence-matched education from Collection 14 and published literature. This is a briefing for you and a clinician, not a treatment plan.',
  ctaGenerate: 'Build evidence briefing',
  ctaRegenerate: 'Refresh evidence briefing',
  emptyPrompt:
    'Select one or more goals. Hannah will show what our database and the literature actually show for compounds linked to those goals, ranked by evidence strength.',
  thinResultTitle: 'The honest result is thin',
  thinResultBody:
    'After exclusions and goal-specific grading, few or no compounds have strong human evidence for this goal in our corpus. That is a useful finding. Bring this briefing to a licensed clinician.',
  clinicianPathway:
    'Discuss these materials with a licensed clinician who knows your history. ViaConnect does not write Rx orders, set doses, or source peptides.',
  disclaimerLayer:
    'Educational information only. Not medical advice. Compounds are ranked by evidence for your stated goal. Absence of human evidence is stated plainly. ViaConnect does not sell peptides.',
  gradeBandA: 'Grade A: multiple adequately powered human trials for this goal',
  gradeBandB: 'Grade B: supportive human evidence for this goal, still limited',
  gradeBandC: 'Grade C: early or mixed human evidence for this goal',
  gradeBandD: 'Grade D: animal or laboratory data with little or no human evidence for this goal',
  gradeBandE: 'Grade E: insufficient evidence for this goal in sources we hold',
} as const;

/** Forbidden tokens on suggestion surfaces (G28). */
export const SUGGESTION_LEXICON_FORBIDDEN = [
  'protocol',
  'regimen',
  'prescription',
  'prescribe',
  'recommendation',
  'recommend',
  'you should take',
  'best for you',
] as const;

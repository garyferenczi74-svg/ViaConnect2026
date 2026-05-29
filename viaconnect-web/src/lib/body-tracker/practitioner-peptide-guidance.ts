// =============================================================================
// Practitioner-only peptide protocol guidance (educational content).
// Prompt #169 Task 3 (spec section 12, item 5).
// =============================================================================
// COMPLIANCE CONTRACT (hard rules, enforced by tests):
//   * This content is PRACTITIONER-FACING ONLY. It must never be imported by a
//     consumer-facing surface.
//   * Retatrutide may be referenced ONLY here and ONLY as injectable-only.
//   * Tesofensine and Semaglutide must NEVER appear anywhere in this content.
//   * No non-catalog commercial product is recommended; copy is educational and
//     points the practitioner to clinical judgment, not to a purchase.
//   * Educational framing only: no dosing protocols, no treatment directives.
//
// The exported `assertPeptideCopyCompliant` helper runs the forbidden-term scan
// over the assembled copy; the test suite calls it so a future content edit that
// reintroduces a banned compound fails CI.
// =============================================================================

export interface PeptideGuidanceItem {
  /** Stable id for React keys. */
  id: string;
  /** Compound or class name as shown to the practitioner. */
  name: string;
  /** Educational, non-directive description. */
  note: string;
  /** Route-of-administration disclosure shown as a small tag. */
  routeTag: string;
}

export interface PeptideGuidanceContent {
  heading: string;
  /** Educational framing shown above the items. */
  intro: string;
  items: PeptideGuidanceItem[];
  /** Standing disclaimer shown below the items. */
  disclaimer: string;
}

/**
 * Forbidden compound names. Any occurrence (case-insensitively) in the assembled
 * peptide copy is a hard compliance failure.
 */
export const FORBIDDEN_PEPTIDE_TERMS: readonly string[] = ['tesofensine', 'semaglutide'];

export const PRACTITIONER_PEPTIDE_GUIDANCE: PeptideGuidanceContent = {
  heading: 'Peptide protocol guidance',
  intro:
    'Educational reference for practitioners reviewing body composition trends. This is background context for clinical discussion; it is not a dosing protocol, a treatment directive, or a product recommendation. Selection, candidacy, and any therapy decision rest with the supervising practitioner and the patient.',
  items: [
    {
      id: 'glp1-class',
      name: 'GLP-1 receptor agonist class',
      note: 'Practitioners evaluating fat-mass trajectory may discuss the GLP-1 class in the context of appetite regulation and metabolic health. Class-level education only; individual candidacy and monitoring are clinical decisions.',
      routeTag: 'Class education',
    },
    {
      id: 'retatrutide',
      name: 'Retatrutide',
      note: 'Retatrutide is investigational and injectable-only. Reference is provided for practitioner awareness of the evolving incretin landscape. It is not a recommendation; any consideration belongs in a supervised clinical setting with appropriate informed consent.',
      routeTag: 'Injectable-only',
    },
    {
      id: 'recovery-peptides',
      name: 'Recovery and tissue-support peptides',
      note: 'When asymmetry or recovery shows up in scan trends, practitioners sometimes discuss tissue-support peptides as part of a broader recovery conversation. Educational context only; evidence quality varies and clinical oversight is essential.',
      routeTag: 'Practitioner discretion',
    },
  ],
  disclaimer:
    'Content is informational and intended for licensed practitioners. It does not diagnose, treat, cure, or prevent any condition, and it does not endorse any specific commercial product. Always follow applicable regulations and your own clinical guidelines.',
};

/**
 * Flatten all human-readable strings in a guidance content block into one
 * lower-cased haystack for the forbidden-term scan.
 */
export function flattenGuidanceCopy(content: PeptideGuidanceContent): string {
  const parts: string[] = [content.heading, content.intro, content.disclaimer];
  for (const item of content.items) {
    parts.push(item.name, item.note, item.routeTag);
  }
  return parts.join(' \n ').toLowerCase();
}

/**
 * Returns the list of forbidden compound terms present in the content. Empty
 * array means compliant.
 */
export function findForbiddenPeptideTerms(content: PeptideGuidanceContent): string[] {
  const haystack = flattenGuidanceCopy(content);
  return FORBIDDEN_PEPTIDE_TERMS.filter((term) => haystack.includes(term));
}

/**
 * Throws if the guidance content references any forbidden compound. Also asserts
 * that any Retatrutide reference is accompanied by an injectable-only
 * disclosure, since the spec permits Retatrutide ONLY as injectable-only.
 */
export function assertPeptideCopyCompliant(content: PeptideGuidanceContent): void {
  const forbidden = findForbiddenPeptideTerms(content);
  if (forbidden.length > 0) {
    throw new Error(`Forbidden peptide term(s) in practitioner copy: ${forbidden.join(', ')}`);
  }
  const haystack = flattenGuidanceCopy(content);
  if (haystack.includes('retatrutide') && !haystack.includes('injectable-only')) {
    throw new Error('Retatrutide referenced without injectable-only disclosure.');
  }
}

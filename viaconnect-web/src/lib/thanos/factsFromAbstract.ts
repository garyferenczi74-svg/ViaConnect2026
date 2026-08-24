/**
 * Prompt 225a Section 6: facts-only extraction from PubMed abstracts.
 * Never store abstract body. Produce short paraphrased educational facts.
 */

import {
  assertNoDoseLexicon,
  redactDoseInstructionText,
} from '@/lib/thanos/doseRedaction';

export interface PublicationFacts {
  design: string;
  model: 'human' | 'animal' | 'in_vitro' | 'mixed' | 'unknown';
  indication_hint: string;
  outcome_hint: string;
  linked_nct_ids: string[];
  publication_types: string[];
  is_human: boolean;
  is_animal: boolean;
  is_in_vitro: boolean;
  note: string;
  redaction_count: number;
}

const NCT_RE = /\bNCT\d{8}\b/gi;

function classifyModel(text: string): PublicationFacts['model'] {
  const t = text.toLowerCase();
  const human =
    /\b(patient|patients|participant|participants|men|women|adults|children|human)\b/.test(
      t,
    );
  const animal =
    /\b(mice|mouse|rat|rats|murine|rodent|canine|porcine|nonhuman primate)\b/.test(
      t,
    );
  const vitro = /\b(in vitro|cell line|cell culture|ex vivo)\b/.test(t);
  if (human && (animal || vitro)) return 'mixed';
  if (human) return 'human';
  if (animal) return 'animal';
  if (vitro) return 'in_vitro';
  return 'unknown';
}

function designFromTypes(types: string[], model: PublicationFacts['model']): string {
  const joined = types.join(' ').toLowerCase();
  if (joined.includes('meta-analysis')) return 'meta_analysis';
  if (joined.includes('systematic review')) return 'systematic_review';
  if (joined.includes('randomized') || joined.includes('clinical trial')) {
    return 'human_clinical_trial';
  }
  if (joined.includes('case report')) return 'case_report';
  if (joined.includes('review')) return 'review';
  if (model === 'animal') return 'animal_study';
  if (model === 'in_vitro') return 'in_vitro_study';
  if (model === 'human') return 'human_study';
  return 'unknown';
}

/**
 * Build paraphrased facts. Abstract is an input only; it is not returned for storage.
 */
export function extractPublicationFacts(opts: {
  title: string;
  abstract: string;
  publicationTypes?: string[];
}): PublicationFacts {
  const types = opts.publicationTypes ?? [];
  const raw = `${opts.title}\n${opts.abstract}`;
  const redacted = redactDoseInstructionText(raw);
  const model = classifyModel(raw);
  const ncts = [...new Set((raw.match(NCT_RE) ?? []).map((x) => x.toUpperCase()))];

  // Templated paraphrases only (never lift sentences from the abstract).
  const t = `${opts.title} ${redacted.text}`.toLowerCase();
  let indication =
    'Indication context not confidently extracted; see title and citation link.';
  if (/\btype 2 diabetes|t2dm|diabetes mellitus\b/.test(t)) {
    indication = 'Studied in a type 2 diabetes context (see citation).';
  } else if (/\bobesity|overweight|weight loss\b/.test(t)) {
    indication = 'Studied in an obesity or weight-management context (see citation).';
  } else if (/\bwound|tendon|ligament|repair\b/.test(t)) {
    indication = 'Studied in a tissue-repair or wound context (see citation).';
  } else if (/\bgrowth hormone|gh secretagogue|ghrelin\b/.test(t)) {
    indication = 'Studied in a growth-hormone or secretagogue context (see citation).';
  } else if (/\bcognitive|neuro|brain\b/.test(t)) {
    indication = 'Studied in a cognitive or neurologic context (see citation).';
  }

  let outcome =
    'Directional findings summarized qualitatively; see linked publication for primary source.';
  if (/\bno significant|did not differ|nonsignificant\b/.test(t)) {
    outcome =
      'Authors reported no significant difference on key endpoints (see citation).';
  } else if (/\bimproved|increased|decreased|reduced|associated with\b/.test(t)) {
    outcome =
      'Authors reported directional changes on studied endpoints (see citation).';
  }

  // Final lexicon guard on stored strings
  if (!assertNoDoseLexicon(indication)) {
    indication = 'Indication context redacted for dose-safety policy.';
  }
  if (!assertNoDoseLexicon(outcome)) {
    outcome = 'Outcome summary redacted for dose-safety policy.';
  }

  return {
    design: designFromTypes(types, model),
    model,
    indication_hint: indication,
    outcome_hint: outcome,
    linked_nct_ids: ncts.slice(0, 8),
    publication_types: types.slice(0, 12),
    is_human: model === 'human' || model === 'mixed',
    is_animal: model === 'animal' || model === 'mixed',
    is_in_vitro: model === 'in_vitro' || model === 'mixed',
    note: 'Paraphrased educational facts only. Abstract body not stored.',
    redaction_count: redacted.redactionCount,
  };
}

/** Copyright guard: facts must not be a near-copy of the abstract. */
export function factsTooSimilarToAbstract(
  facts: PublicationFacts,
  abstract: string,
): boolean {
  if (!abstract || abstract.length < 40) return false;
  const blob = `${facts.indication_hint} ${facts.outcome_hint}`.toLowerCase();
  const abs = abstract.toLowerCase();
  // Reject if a 40-char window of facts appears verbatim in abstract
  for (let i = 0; i <= blob.length - 40; i += 10) {
    const window = blob.slice(i, i + 40).trim();
    if (window.length === 40 && abs.includes(window)) return true;
  }
  return false;
}

/**
 * Prompt 225: Hannah peptide refusal matrix (code-enforced, pre-model).
 * Returns educational refusals with practitioner redirect. No dose, sourcing,
 * or acquisition content is ever emitted.
 */

export type PeptideRefusalCode =
  | 'dose_request'
  | 'trial_protocol_dosing'
  | 'sourcing_request'
  | 'minor_request'
  | 'pregnancy_request'
  | 'excluded_dermorphin'
  | 'disease_cure_framing'
  | 'prescription_superiority'
  | 'mthfr_overclaim'
  | 'cyp_clearance_overclaim'
  | 'glp1_wada_myth'
  | 'stack_combination'
  | 'non_peptide_mislabel';

export interface PeptideRefusal {
  code: PeptideRefusalCode;
  answer: string;
}

const PRACTITIONER =
  'Please discuss peptide education with a licensed healthcare practitioner who can review your labs and clinical context. ViaConnect provides education only and does not sell peptides, provide dosing, reconstitution, injection technique, cycle schedules, or sourcing guidance.';

function has(q: string, ...parts: string[]): boolean {
  return parts.every((p) => q.includes(p));
}

function any(q: string, ...parts: string[]): boolean {
  return parts.some((p) => q.includes(p));
}

/**
 * Detect a hard refusal class for a user question. First match wins.
 * Pure function for unit tests.
 */
export function detectPeptideRefusal(question: string): PeptideRefusal | null {
  const q = question.toLowerCase().replace(/[\u2013\u2014\u2015]/g, '-');

  if (any(q, 'dermorphin')) {
    return {
      code: 'excluded_dermorphin',
      answer:
        'Dermorphin is an excluded adverse reference in the Peptide Education Database. It is not discussed as a wellness option. ' +
        PRACTITIONER,
    };
  }

  // Prompt 225a Section 10.3: NCT protocol dosing request
  const nctMatch = q.match(/\bnct\s*0*\d{6,8}\b/i) || question.match(/\bNCT\d{8}\b/);
  if (
    nctMatch &&
    any(
      q,
      'dose',
      'dosing',
      'dosage',
      'how much',
      'mg',
      'mcg',
      'protocol dose',
      'what dose was used',
      'summarise the dosing',
      'summarize the dosing',
      'dosing used in',
    )
  ) {
    const nct = (nctMatch[0] || '').toUpperCase().replace(/\s+/g, '');
    const nctId = nct.startsWith('NCT') ? nct : `NCT${nct.replace(/^NCT/i, '')}`;
    const normalized = nctId.match(/NCT\d{8}/)?.[0] ?? nctId;
    return {
      code: 'trial_protocol_dosing',
      answer:
        `I cannot restate protocol dosing, titration, reconstitution, or administration instructions from trial ${normalized} or any registry record. ` +
        `If that study used multiple dose arms, that design fact may be discussed educationally without restating amounts. ` +
        `The public protocol is available on ClinicalTrials.gov at https://clinicaltrials.gov/study/${normalized}. ` +
        PRACTITIONER,
    };
  }

  if (
    any(q, 'how much should i take', 'what dose', 'what dosage', 'dosing protocol', 'titration schedule') ||
    (any(q, 'mcg', 'mg/kg', 'iu ') && any(q, 'take', 'inject', 'dose', 'dosage')) ||
    any(q, 'how do i reconstitute', 'bacteriostatic water', 'bac water', 'injection site', 'how to inject') ||
    // Prompt 226: never validate / confirm appropriateness of a specific dose value
    (/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|iu)\b/i.test(question) &&
      any(
        q,
        'right for me',
        'ok for me',
        'okay for me',
        'appropriate',
        'is that enough',
        'too much',
        'too little',
        'should i take',
        'can i take',
        'safe to take',
      ))
  ) {
    return {
      code: 'dose_request',
      answer:
        'I cannot provide dosing, reconstitution, injection technique, cycle length, or titration schedules for peptides at any access tier. ' +
        'I also cannot confirm, validate, or comment on whether a specific dose value is appropriate for you. ' +
        PRACTITIONER,
    };
  }

  if (
    any(
      q,
      'where can i buy',
      'where do i buy',
      'who sells',
      'vendor',
      'gray market',
      'grey market',
      'research chem',
      'order peptide',
      'purchase peptide',
    )
  ) {
    return {
      code: 'sourcing_request',
      answer:
        'I cannot provide sourcing, vendor, marketplace, or acquisition information for peptides. ViaConnect does not sell peptides and does not route purchase paths. ' +
        PRACTITIONER,
    };
  }

  if (
    any(
      q,
      'for my child',
      'for my kid',
      'my child',
      'my kid',
      'my teenager',
      'pediatric peptide',
      'give my child',
      'to my child',
    ) ||
    (any(q, 'minor') && any(q, 'peptide'))
  ) {
    return {
      code: 'minor_request',
      answer:
        'I cannot discuss peptide use for minors. That requires specialized pediatric clinical judgment. ' +
        PRACTITIONER,
    };
  }

  if (any(q, 'pregnant', 'pregnancy', 'breastfeeding', 'breast feeding', 'lactating', 'nursing')) {
    return {
      code: 'pregnancy_request',
      answer:
        'I cannot advise on peptide use during pregnancy or breastfeeding. Please speak with an obstetric or primary clinician immediately for personalized guidance. ' +
        PRACTITIONER,
    };
  }

  if (
    any(q, 'cure my', 'treat my cancer', 'heal my disease', 'reverse my diabetes', 'prevent my alzheimer') ||
    (any(q, 'cure', 'treat', 'heal', 'reverse') &&
      any(q, 'cancer', 'alzheimer', 'diabetes', 'ms ', 'parkinson') &&
      any(q, 'peptide', 'bpc', 'semax', 'ghk'))
  ) {
    return {
      code: 'disease_cure_framing',
      answer:
        'Peptide education on ViaConnect is structure/function research framing only. It does not diagnose, treat, cure, or prevent disease. ' +
        PRACTITIONER,
    };
  }

  if (
    any(q, 'better than my prescription', 'instead of my prescription', 'replace my ozempic', 'stop my medication') ||
    (any(q, 'better than') && any(q, 'prescription', 'ozempic', 'mounjaro', 'wegovy'))
  ) {
    return {
      code: 'prescription_superiority',
      answer:
        'I cannot compare peptides as superior to your prescribed therapy or advise stopping prescription medicines. Stay on prescribed care and review any questions with the prescribing clinician. ' +
        PRACTITIONER,
    };
  }

  if (any(q, 'mthfr') && any(q, 'peptide') && any(q, 'means i should', 'so i need', 'clears me', 'safe for me')) {
    return {
      code: 'mthfr_overclaim',
      answer:
        'An MTHFR genotype does not clear you for peptide use and does not create a peptide recommendation by itself. Genetic findings are relevance signals only. ' +
        PRACTITIONER,
    };
  }

  if (
    any(q, 'cyp2d6', 'cyp3a4', 'cyp ') &&
    any(q, 'peptide') &&
    any(q, 'clearance', 'metabolize', 'so i should take', 'dose')
  ) {
    return {
      code: 'cyp_clearance_overclaim',
      answer:
        'CYP genotype notes about peptide clearance are educational relevance signals only. They are not dosing instructions and do not authorize self-administration. ' +
        PRACTITIONER,
    };
  }

  if (
    (any(q, 'glp-1', 'glp1', 'semaglutide', 'tirzepatide', 'ozempic', 'wegovy', 'mounjaro') &&
      any(q, 'banned in sport', 'wada banned', 'prohibited by wada', 'illegal in competition')) ||
    has(q, 'glp', 'banned')
  ) {
    return {
      code: 'glp1_wada_myth',
      answer:
        'Approved GLP-1 receptor agonists used as labeled medicines are not categorically the same as WADA-prohibited peptide hormones. Anti-doping status is compound-specific and must be verified against the current WADA Prohibited List with a sports medicine clinician. Unverified database fields remain unknown, not cleared. ' +
        PRACTITIONER,
    };
  }

  if (
    (any(q, 'mk-677', 'ibutamoren', '5-amino-1mq', '5 amino 1mq', 'slu-pp-332', 'tesofensine', 'rapamycin') &&
      any(q, 'peptide', 'is a peptide', 'which peptide')) ||
    any(q, 'is mk-677 a peptide', 'is 5-amino-1mq a peptide')
  ) {
    return {
      code: 'non_peptide_mislabel',
      answer:
        'Several compounds commonly discussed alongside peptides are not peptides (for example MK-677/ibutamoren, 5-Amino-1MQ, SLU-PP-332, and tesofensine). The Peptide Education Database labels them honestly with is_peptide = false. ' +
        PRACTITIONER,
    };
  }

  if (
    any(q, 'wolverine stack', 'glow stack', 'klow stack', 'cagrisema', 'cjc and ipamorelin', 'semax and selank') ||
    (any(q, 'stack') && any(q, 'peptide', 'bpc', 'tb-500', 'ghk', 'wolverine', 'glow', 'klow'))
  ) {
    return {
      code: 'stack_combination',
      answer:
        'Most commercial peptide stacks have no human combination data. Claimed effects are usually extrapolated from individual components, and interactions are generally uncharacterised. CagriSema-style studied combinations are the exception and still require clinician oversight. ' +
        PRACTITIONER,
    };
  }

  return null;
}

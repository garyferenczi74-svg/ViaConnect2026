/**
 * Brief 49: one homework line per visible regimen item.
 *
 * Hannah why-line: educational, not a diagnosis, speak to a provider.
 * Arnold input chip: only the locked vocabulary, and only from a real source
 * field. time_source=hannah is not an input chip.
 *
 * Live user_current_supplements.columns used: supplement_name, dosage_form,
 * source. ingredient_library.mechanism_summary is null on current rows, so
 * molecule why is omitted unless a real educational string is passed in.
 * CAQ "delivery method" values such as standard_actives are categories, not
 * capsule / liposomal / injectable. Do not invent those forms.
 *
 * No emojis. No em or en dashes.
 */

export const PROTOCOL_INPUT_CHIPS = [
  'from CAQ',
  'from lab',
  'from GENEX360',
  'from GeneXM',
  'from profile',
] as const;

export type ProtocolInputChip = (typeof PROTOCOL_INPUT_CHIPS)[number];

export const PROTOCOL_HOMEWORK_OMISSION =
  'Educational why is not on file for this item. Speak with a provider.';

export const PROTOCOL_MOLECULE_PROVIDER_NOTE =
  'Educational, not a diagnosis. Speak with a provider.';

export interface ProtocolHomeworkInput {
  name: string;
  dosageForm?: string | null;
  source?: string | null;
  /** Existing educational copy only. Never invent CAQ, lab, or gene text. */
  moleculeWhy?: string | null;
  /** Brief 51: from GENEX360 only when a real GENEX360 / kit row exists. */
  hasGenex360Row?: boolean;
  /** Brief 51: from GeneXM only when a real GeneXM / genex_m row exists. */
  hasGenexmRow?: boolean;
}

export interface ProtocolHomework {
  moleculeWhy: string | null;
  deliveryWhy: string | null;
  inputChip: ProtocolInputChip | null;
  omission: string | null;
}

const PHYSICAL_DELIVERY: Readonly<Record<string, string>> = {
  liposomal_delivery: 'liposomal',
  liposomal: 'liposomal',
  micellar_delivery: 'micellar',
  micellar: 'micellar',
  injectable: 'injectable',
  injection: 'injectable',
  standard_capsule: 'capsule',
  capsule: 'capsule',
  capsules: 'capsule',
  standard_tablet: 'tablet',
  tablet: 'tablet',
  softgel: 'softgel',
  powder: 'powder',
  scoop_powder: 'powder',
  'scoop powder': 'powder',
  liquid: 'liquid',
  gummy: 'gummy',
  tincture: 'tincture',
  lozenge: 'lozenge',
  spray: 'spray',
  sublingual: 'sublingual',
  topical: 'topical',
};

const NAME_FORM_PATTERN =
  /\b(liposomal|micellar|injectable|capsules?|powder|softgel|tablet|gummy|tincture|lozenge)\b/i;

function normalizeKey(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isRetatrutide(name: string): boolean {
  return /\bretatrutide\b/i.test(name);
}

function isSemaglutide(name: string): boolean {
  return /\bsemaglutide\b/i.test(name);
}

/**
 * Arnold input: locked Brief 49 chips only when the stored source field
 * actually maps. farmceutica, photo_ai, ai_search, and time_source=hannah
 * do not become from CAQ / lab / gene.
 */
export function chipForProtocolSource(
  source: string | null | undefined,
  proof?: Pick<ProtocolHomeworkInput, 'hasGenex360Row' | 'hasGenexmRow'>,
): ProtocolInputChip | null {
  if (typeof source !== 'string') return null;
  const key = normalizeKey(source);
  if (!key) return null;

  if (key === 'caq' || key === 'caq_backfill' || key === 'clinical_assessments') {
    return 'from CAQ';
  }
  if (
    key === 'lab' ||
    key === 'lab_result' ||
    key === 'lab_results' ||
    key === 'lab_biomarker' ||
    key === 'lab_biomarkers'
  ) {
    return 'from lab';
  }
  if (key === 'genex360' || key === 'gene_x360' || key === 'genex_360') {
    return proof?.hasGenex360Row === true ? 'from GENEX360' : null;
  }
  if (key === 'genexm' || key === 'gene_xm' || key === 'genex_m') {
    return proof?.hasGenexmRow === true ? 'from GeneXM' : null;
  }
  if (key === 'profile' || key === 'manual' || key === 'user_logged') {
    return 'from profile';
  }
  return null;
}

function formFromDosageField(dosageForm: string | null | undefined): string | null {
  const key = normalizeKey(dosageForm);
  if (!key) return null;
  return PHYSICAL_DELIVERY[key] ?? null;
}

function formFromProductName(name: string): string | null {
  const match = name.match(NAME_FORM_PATTERN);
  if (!match) return null;
  const token = match[1].toLowerCase();
  if (token === 'capsules') return 'capsule';
  return PHYSICAL_DELIVERY[token] ?? token;
}

export function deliveryFormLabel(
  input: Pick<ProtocolHomeworkInput, 'name' | 'dosageForm'>,
): string | null {
  const fromField = formFromDosageField(input.dosageForm);
  const fromName = formFromProductName(input.name);
  const form = fromField ?? fromName;
  if (!form) return null;

  if (isRetatrutide(input.name) && form !== 'injectable') {
    return null;
  }
  return form;
}

export function deliveryWhyLine(form: string | null): string | null {
  if (!form) return null;
  if (form === 'injectable') {
    return 'Injectable is the recorded delivery form. Not stacked.';
  }
  const label = form.charAt(0).toUpperCase() + form.slice(1);
  return `${label} is the recorded delivery form.`;
}

function sanitizeMoleculeWhy(raw: string | null | undefined, name: string): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (/add to stack|stack builder/i.test(text)) return null;
  if (isSemaglutide(name) || /semaglutide/i.test(text)) return null;
  if (/5\s*[–—-]\s*27x|5-27x/i.test(text)) return null;
  const withNote = /speak with a provider|licensed practitioner/i.test(text)
    ? text
    : `${text} ${PROTOCOL_MOLECULE_PROVIDER_NOTE}`;
  return withNote;
}

export function buildProtocolHomework(input: ProtocolHomeworkInput): ProtocolHomework {
  const moleculeWhy = sanitizeMoleculeWhy(input.moleculeWhy, input.name);
  const form = deliveryFormLabel(input);
  const deliveryWhy = deliveryWhyLine(form);
  const inputChip = chipForProtocolSource(input.source, {
    hasGenex360Row: input.hasGenex360Row,
    hasGenexmRow: input.hasGenexmRow,
  });

  if (moleculeWhy || deliveryWhy || inputChip) {
    return {
      moleculeWhy,
      deliveryWhy,
      inputChip,
      omission: null,
    };
  }

  return {
    moleculeWhy: null,
    deliveryWhy: null,
    inputChip: null,
    omission: PROTOCOL_HOMEWORK_OMISSION,
  };
}

export function homeworkHasContent(homework: ProtocolHomework): boolean {
  return Boolean(homework.moleculeWhy || homework.deliveryWhy || homework.inputChip || homework.omission);
}

export function formatHomeworkText(homework: ProtocolHomework): string {
  if (homework.omission) return homework.omission;
  return [homework.moleculeWhy, homework.deliveryWhy].filter((part): part is string => Boolean(part)).join(' ');
}

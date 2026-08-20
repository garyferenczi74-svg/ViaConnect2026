/**
 * Prompt 225a Section 5: dose redaction between extraction and storage.
 * Redact at ingest. Never store prohibited instructional content.
 */

const DOSE_QUANTITY =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|iu|u|ng|mmol|mg\/kg|mcg\/kg|mg\/m2|mg\/m²|cc|ml)\b/gi;

const FREQUENCY_BOUND =
  /\b(?:once|twice|thrice)\s+(?:daily|weekly|monthly)\b|\b(?:qd|bid|tid|qid|qod|q4w|q2w|qw)\b|\bevery\s+other\s+day\b|\bevery\s+\d+\s*(?:hours?|days?|weeks?)\b/gi;

const ROUTE_INSTRUCTION =
  /\b(?:subcutaneous(?:ly)?|intramuscular(?:ly)?|intravenous(?:ly)?|oral(?:ly)?|intranasal(?:ly)?)\s+(?:injection|administration|dose|dosing)?\b/gi;

const TITRATION =
  /\b(?:titrat(?:e|ion|ed|ing)|escalat(?:e|ion|ed|ing)|loading\s+dose|maintenance\s+dose)\b/gi;

const RECONSTITUTION =
  /\b(?:reconstitut(?:e|ion|ed|ing)|diluent|bacteriostatic\s+water|bac\s*water)\b/gi;

export interface RedactionResult {
  text: string;
  redactionCount: number;
  doseRedactionApplied: boolean;
}

export function redactDoseInstructionText(input: string): RedactionResult {
  if (!input) {
    return { text: '', redactionCount: 0, doseRedactionApplied: true };
  }
  let text = input;
  let redactionCount = 0;
  const patterns = [
    DOSE_QUANTITY,
    FREQUENCY_BOUND,
    ROUTE_INSTRUCTION,
    TITRATION,
    RECONSTITUTION,
  ];
  for (const re of patterns) {
    text = text.replace(re, () => {
      redactionCount += 1;
      return '[REDACTED]';
    });
  }
  // Collapse repeated redaction markers
  text = text.replace(/(\[REDACTED\]\s*){2,}/g, '[REDACTED] ');
  return {
    text: text.replace(/[\u2013\u2014]/g, '-').trim(),
    redactionCount,
    doseRedactionApplied: true,
  };
}

/** Intervention names: strip quantity/unit tokens; keep molecule name tokens. */
export function redactInterventionName(name: string): string {
  const { text } = redactDoseInstructionText(name);
  return text
    .replace(/\[REDACTED\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function assertNoDoseLexicon(text: string): boolean {
  if (!text) return true;
  return !new RegExp(
    `${DOSE_QUANTITY.source}|${FREQUENCY_BOUND.source}|${TITRATION.source}|${RECONSTITUTION.source}`,
    'i',
  ).test(text);
}

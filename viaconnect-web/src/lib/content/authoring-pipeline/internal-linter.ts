// Prompt 170r internal clinical-claim linter.
// Deterministic. Zero runtime LLM.
//
// Fails on: em dashes, en dashes, extra dash codepoints, emojis,
// Semaglutide, and diagnose/treat/cure claim language.
//
// Educational negation and the DSHEA footer are allowed so Gordon-authored
// genetics cards can say "does not diagnose" without tripping the gate.

import { lintClinicalClaims } from '../../compliance/clinical-claim-linter';
import { EMOJI_REGEX } from '../../compliance/dictionaries/forbidden_phrases';
import type { CardLintResult, LintFinding, ParsedCard } from './types';

const EM_DASH = '\u2014';
const EN_DASH = '\u2013';
const HORIZONTAL_BAR = '\u2015';
const MINUS_SIGN = '\u2212';

const ALLOWED_CLAIM_SPANS: RegExp[] = [
  /not intended to diagnose,\s*treat,\s*cure,\s*or\s*prevent[^.]*\.?/gi,
  /\bdoes not diagnose\b/gi,
  /\bdo not diagnose\b/gi,
  /\bnot diagnose\b/gi,
  /\bdouble-diagnose\b/gi,
  /\bdo not treat\b/gi,
  /\bdoes not treat\b/gi,
  /\bnot treat\b/gi,
  /\btreat\b[^.?\n]{0,120}\bas\b/gi,
  /\binflammation-cure\b/gi,
  /\bcure claims\b/gi,
  /\bas treatment\b/gi,
  /\bleaky gut treatment\b/gi,
  /\bowns diagnosis and treatment\b/gi,
];

export function lintEducationalCard(card: ParsedCard): CardLintResult {
  const findings: LintFinding[] = [];
  const scanText = `${card.frontmatterRaw}\n${card.body}`;

  collectCodepoint(findings, scanText, EM_DASH, 'em_dash', 'em dash is not allowed');
  collectCodepoint(findings, scanText, EN_DASH, 'en_dash', 'en dash is not allowed');
  collectCodepoint(
    findings,
    scanText,
    HORIZONTAL_BAR,
    'dash_codepoint',
    'horizontal bar is not allowed',
  );
  collectCodepoint(
    findings,
    scanText,
    MINUS_SIGN,
    'dash_codepoint',
    'unicode minus is not allowed',
  );
  collectRegex(findings, scanText, EMOJI_REGEX, 'emoji', 'emoji is not allowed');
  collectRegex(
    findings,
    scanText,
    /\bsemaglutide\b/gi,
    'semaglutide',
    'Semaglutide is excluded from Via Cura educational cards',
  );

  if (!card.hasFdaDisclaimer) {
    findings.push({
      code: 'fda_disclaimer_missing',
      message: 'FDA disclaimer with the DSHEA verb pair is required',
      index: 0,
      excerpt: '',
    });
  }

  const rangeHits = scanText.match(/\b\d+x\s+to\s+\d+x\b/gi) ?? [];
  for (const hit of rangeHits) {
    if (hit.toLowerCase() !== '10x to 28x') {
      findings.push({
        code: 'bioavailability_range',
        message: `bioavailability range must be "10x to 28x" (found ${hit})`,
        index: scanText.toLowerCase().indexOf(hit.toLowerCase()),
        excerpt: hit,
      });
    }
  }

  findings.push(...lintDiagnoseTreatCure(card.body));

  const sharedSource = neutralizeSharedLinterFalsePositives(card.body);
  const shared = lintClinicalClaims(sharedSource);
  for (const violation of shared.violations) {
    findings.push({
      code: 'clinical_claim',
      message: `clinical claim (${violation.kind}): ${violation.match}`,
      index: violation.index,
      excerpt: violation.match,
    });
  }

  findings.sort((a, b) => a.index - b.index);
  return { ok: findings.length === 0, findings };
}

function lintDiagnoseTreatCure(body: string): LintFinding[] {
  const withoutDisclaimer = stripFdaDisclaimerSection(body);
  let scrubbed = withoutDisclaimer;
  for (const allow of ALLOWED_CLAIM_SPANS) {
    allow.lastIndex = 0;
    scrubbed = scrubbed.replace(allow, ' ');
  }
  scrubbed = scrubbed.replace(/\bdiagnos(?:is|es)\b/gi, ' ');
  scrubbed = scrubbed.replace(/\btreatments?\b/gi, ' ');

  const findings: LintFinding[] = [];
  const claimRx = /\b(?:diagnos(?:e|es|ed|ing)|treat(?:s|ed|ing)|cure(?:s|d|ing)?)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = claimRx.exec(scrubbed)) !== null) {
    findings.push({
      code: 'diagnose_treat_cure',
      message: `diagnose/treat/cure claim language: ${match[0]}`,
      index: match.index,
      excerpt: excerptAt(scrubbed, match.index, match[0].length),
    });
  }
  return findings;
}

function stripFdaDisclaimerSection(body: string): string {
  return body.replace(/^##\s+FDA disclaimer\s*$[\s\S]*/im, ' ');
}

function neutralizeSharedLinterFalsePositives(body: string): string {
  return body
    .replace(/inflammation-cure claims/gi, 'research language')
    .replace(/cure claims/gi, 'research language');
}

function collectCodepoint(
  findings: LintFinding[],
  text: string,
  char: string,
  code: LintFinding['code'],
  message: string,
): void {
  let index = text.indexOf(char);
  while (index !== -1) {
    findings.push({
      code,
      message,
      index,
      excerpt: excerptAt(text, index, char.length),
    });
    index = text.indexOf(char, index + 1);
  }
}

function collectRegex(
  findings: LintFinding[],
  text: string,
  rx: RegExp,
  code: LintFinding['code'],
  message: string,
): void {
  rx.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text)) !== null) {
    findings.push({
      code,
      message,
      index: match.index,
      excerpt: excerptAt(text, match.index, match[0].length),
    });
  }
}

function excerptAt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + length + 24);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

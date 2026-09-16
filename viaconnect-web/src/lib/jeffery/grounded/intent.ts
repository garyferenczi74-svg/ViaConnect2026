/**
 * Conservative required-tool inference for the Stage A stub.
 * Prefer refuse over answering when a claim would need an unwired engine.
 */

import { isEducationAsk } from "./education-allowlist";
import type { GroundedToolName } from "./types";

const PROTOCOL_RE =
  /\b(protocol|regimen|already listed|on my (list|plan)|why (am i|do i) (take|taking)|my supplements|my stack)\b/i;
const DOSE_RE = /\b(dose|dosage|dosing|how much (should|do) i take|titrat|stacking schedule)\b/i;
const INTERACT_RE =
  /\b(interact|conflict|contraindicat|safe to (mix|combine|take together)|together with|stack.?saf)\b/i;
const SNP_RE =
  /\b(rs\d{4,}|genotype|snp\b|mthfr|comt\+|nutrigendx|gene(tic)? (result|variant|card))\b/i;
const PEPTIDE_RE =
  /\b(peptide|peptideiq|sermorelin|retatrutide|tirzepatide|semaglutide|glp-?1|bpc-?157|tesamorelin|ipamorelin|cjc-?1295)\b/i;

export function inferRequiredTools(message: string): GroundedToolName[] {
  const required = new Set<GroundedToolName>();
  const peptide = PEPTIDE_RE.test(message);
  if (peptide) required.add("lookup_peptide");
  if (INTERACT_RE.test(message)) required.add("check_interactions");
  if (SNP_RE.test(message)) required.add("lookup_snp");
  if (PROTOCOL_RE.test(message) || DOSE_RE.test(message)) required.add("get_protocol");
  if (peptide && /\b(stack|protocol|together|interact)\b/i.test(message)) {
    required.add("get_protocol");
    required.add("check_interactions");
  }
  if (isEducationAsk(message)) required.add("get_education");
  return Array.from(required);
}

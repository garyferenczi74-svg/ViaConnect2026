// Prompt #112 — PHI redactor: the load-bearing HIPAA safeguard.
// Every external notification body (SMS / Slack / push / email) runs
// through this validator before transmission. A single failed rule drops
// the notification entirely (§3.2 bright-line: no "redacted fallback").
//
// Rules enforced:
//   1. Unrendered template variables ({foo}) — indicates a renderer bug
//   2. Email address pattern
//   3. US phone number pattern
//   4. DOB-like date pattern
//   5. ICD-10 diagnosis code pattern
//   6. Lab value pattern (number + clinical unit)
//   7. rsID (genetic variant) pattern
//   8. Zygosity / genotype pattern
//   9. Medication watchlist (~60 common drugs)
//  10. Gene symbol watchlist (~55 clinically-relevant genes)
//  11. Cross-check Proper-Case tokens against profiles.first_name / last_name
//      to catch accidental name interpolation

import { createAdminClient } from "@/lib/supabase/admin";
import type { PhiViolation, PhiCheckResult } from "./types";

const UNRENDERED_VAR_REGEX = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const DOB_REGEX = /\b(?:0?[1-9]|1[0-2])[\/\-\.](?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:19|20)\d{2}\b/;
const ICD10_REGEX = /\b[A-TV-Z]\d{2}(?:\.\d{1,4})?\b/;
const LAB_VALUE_REGEX = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|IU|mmol|ng|pg|U\/L|mg\/dL|nmol|pmol|g\/dL|mEq\/L|ng\/mL|pg\/mL)\b/i;
const RSID_REGEX = /\brs\d{3,}\b/i;
const ZYGOSITY_REGEX = /\b(?:homozygous|heterozygous|wildtype|[ACTG]\/[ACTG])\b/i;

export const MEDICATION_WATCHLIST: readonly string[] = [
  "metformin","lisinopril","atorvastatin","levothyroxine","amlodipine","omeprazole",
  "albuterol","prednisone","warfarin","insulin","ozempic","semaglutide","tirzepatide",
  "retatrutide","gabapentin","hydrochlorothiazide","losartan","simvastatin","sertraline",
  "escitalopram","fluoxetine","paroxetine","methylprednisolone","furosemide","clonazepam",
  "alprazolam","oxycodone","hydrocodone","tramadol","amoxicillin","azithromycin",
  "ciprofloxacin","doxycycline","pantoprazole","montelukast","tamsulosin","finasteride",
  "sildenafil","tadalafil","lamotrigine","duloxetine","venlafaxine","bupropion",
  "metoprolol","atenolol","carvedilol","valsartan","ramipril","pravastatin","rosuvastatin",
  "clopidogrel","apixaban","rivaroxaban","methotrexate","adderall","ritalin","vyvanse",
  "wellbutrin","lexapro","prozac","zoloft","xanax","ativan","valium","trazodone",
];

export const GENE_SYMBOL_WATCHLIST: readonly string[] = [
  "MTHFR","COMT","MAOA","MAOB","VDR","CYP2D6","CYP2C9","CYP2C19","CYP3A4","CYP1A2",
  "APOE","BRCA1","BRCA2","NAT2","SLCO1B1","UGT1A1","TPMT","DPYD","GSTP1","GSTM1",
  "GSTT1","NOS3","ACE","AGT","HTR2A","ADRB2","ADRB1","BDNF","DRD2","DRD4",
  "IL6","FTO","PPARG","ADIPOQ","LEPR","MC4R","MC1R","AHCY","BHMT","CBS",
  "MTR","MTRR","PEMT","PON1","SOD2","GPX1","NRF2","HFE","FUT2","VKORC1",
  "SLC23A1","SLC30A8","TCF7L2","FABP2","APOA2","LRP5",
];

// Gene symbols that may legitimately appear in product / brand names. When
// the surrounding context is a known product reference, these are allowed.
// Maintain an allowlist so we don't break templates that mention "MTHFR-Methyl Complex".
const GENE_SYMBOL_ALLOWLIST_CONTEXT: readonly string[] = [
  "MTHFR-Methyl",
  "CYP Support",
];

function checkRegex(body: string, rule: string, re: RegExp, violations: PhiViolation[]): void {
  const m = body.match(re);
  if (m) violations.push({ rule, match: m[0], position: m.index ?? -1 });
}

function checkWatchlist(body: string, rule: string, list: readonly string[], violations: PhiViolation[], allowContext?: readonly string[]): void {
  const lower = body.toLowerCase();
  for (const term of list) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx < 0) continue;
    const before = idx === 0 || !/[a-zA-Z0-9_]/.test(body[idx - 1]);
    const after = idx + term.length >= body.length || !/[a-zA-Z0-9_]/.test(body[idx + term.length]);
    if (!before || !after) continue;
    if (allowContext && allowContext.some((ctx) => body.toLowerCase().includes(ctx.toLowerCase()))) continue;
    violations.push({ rule, match: term, position: idx });
    return; // one violation of this class is enough to drop
  }
}

/**
 * Runs all PHI checks on a fully-rendered external body string. Returns
 * { passed, violations }. Caller MUST drop the notification and record a
 * forensic row to notification_phi_redaction_failures on passed=false.
 *
 * crossCheckUserNames pulls a small sample of profiles.first_name/last_name
 * and checks for membership. Expensive relative to regex checks; enable
 * selectively for external-channel paths.
 */
export async function validateExternalBody(
  body: string,
  opts?: { crossCheckUserNames?: boolean; eventCode?: string },
): Promise<PhiCheckResult> {
  const violations: PhiViolation[] = [];

  checkRegex(body, "unrendered_template_variable", UNRENDERED_VAR_REGEX, violations);
  checkRegex(body, "email_address", EMAIL_REGEX, violations);
  checkRegex(body, "phone_number", PHONE_REGEX, violations);
  checkRegex(body, "dob_like_date", DOB_REGEX, violations);
  checkRegex(body, "icd10_code", ICD10_REGEX, violations);
  checkRegex(body, "lab_value", LAB_VALUE_REGEX, violations);
  checkRegex(body, "rsid", RSID_REGEX, violations);
  checkRegex(body, "zygosity", ZYGOSITY_REGEX, violations);

  checkWatchlist(body, "medication_name", MEDICATION_WATCHLIST, violations);
  checkWatchlist(body, "gene_symbol", GENE_SYMBOL_WATCHLIST, violations, GENE_SYMBOL_ALLOWLIST_CONTEXT);

  if (opts?.crossCheckUserNames) {
    const tokens = Array.from(new Set((body.match(/\b[A-Z][a-z]{2,}\b/g) ?? [])));
    if (tokens.length > 0) {
      try {
        const admin = createAdminClient();
        for (const tok of tokens.slice(0, 10)) {
          const { data } = await admin
            .from("profiles")
            .select("id")
            .or(`first_name.ilike.${tok},last_name.ilike.${tok}`)
            .limit(1);
          if (data && data.length > 0) {
            violations.push({ rule: "user_name_match", match: tok, position: body.indexOf(tok) });
            break;
          }
        }
      } catch {
        // A failed cross-check MUST NOT let the notification through. Treat
        // failure as a violation so the notification is dropped safely.
        violations.push({ rule: "user_name_check_unavailable", match: "<service unavailable>", position: -1 });
      }
    }
  }

  return { passed: violations.length === 0, violations };
}

/**
 * Logs a forensic record to notification_phi_redaction_failures. Admin alert
 * side-effect is handled by the caller (dispatcher) after the row lands.
 */
export async function recordPhiRedactionFailure(params: {
  event_code: string;
  intended_recipient: string | null;
  channel: string;
  body_attempted: string;
  violations: PhiViolation[];
  template_version?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notification_phi_redaction_failures").insert({
    event_code: params.event_code,
    intended_recipient: params.intended_recipient,
    channel: params.channel,
    body_attempted: params.body_attempted,
    violations_json: params.violations,
    template_version: params.template_version ?? "prompt_112_v1",
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[phi-redactor] failed to record forensic row:", error.message);
  }
}

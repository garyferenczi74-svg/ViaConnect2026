// Prompt #104 Phase 5: Medical claim regex pre-check.
//
// Defense in depth alongside the AI's has_medical_claim flag. If
// either signal fires, the case routes to pending_medical_director_review
// (Dr. Fadi Dagher) before any enforcement action is permitted.

const DISEASE_CLAIM_PATTERNS: ReadonlyArray<RegExp> = [
  /\bcure[sd]?\s+(?:cancer|diabetes|alzheimer|parkinson|covid|hypertension|depression|arthritis|asthma|hiv|aids|stroke)\b/i,
  /\btreats?\s+(?:cancer|diabetes|alzheimer|parkinson|covid|hypertension|depression|arthritis|asthma|hiv|aids|stroke)\b/i,
  /\bprevent[sd]?\s+(?:cancer|diabetes|alzheimer|parkinson|covid|stroke|heart\s+attack|heart\s+disease)\b/i,
  /\b(?:reverse|reverses|reversed)\s+(?:cancer|diabetes|alzheimer|parkinson|covid|hypertension|aging|disease)\b/i,
  /\bclinically\s+proven\s+to\s+(?:cure|treat|reverse|prevent)\b/i,
  /\bfda[\s-]?approved\s+for\s+(?:cancer|diabetes|alzheimer|parkinson|covid|hypertension|depression)\b/i,
  /\bdiagnose[sd]?\s+(?:cancer|diabetes|alzheimer|parkinson|covid)\b/i,
  /\bmitigate[sd]?\s+(?:cancer|diabetes|alzheimer|stroke|heart\s+disease)\b/i,
];

export interface MedicalClaimScanResult {
  flagged: boolean;
  matched_excerpts: string[];
}

export function scanForMedicalClaims(text: string | null | undefined): MedicalClaimScanResult {
  if (!text) return { flagged: false, matched_excerpts: [] };
  const matches: string[] = [];
  for (const re of DISEASE_CLAIM_PATTERNS) {
    const m = text.match(re);
    if (m) matches.push(m[0]);
  }
  return { flagged: matches.length > 0, matched_excerpts: matches };
}

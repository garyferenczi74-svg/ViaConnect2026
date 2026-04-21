// Prompt #104 Phase 6: Counsel routing engine.
//
// Scores counsel candidates against a case's needs (jurisdiction +
// specialty match). Pure function so the recommendation can be unit-
// tested. The actual selection is always made by the admin proposing
// the engagement.

export interface CaseRouteRequest {
  jurisdiction: string | null;             // e.g., 'US-DE'
  required_specialties: ReadonlyArray<string>;  // e.g., ['ip_litigation']
  bucket: string;
}

export interface CounselCandidate {
  counsel_id: string;
  firm_name: string;
  attorney_name: string;
  specialty: ReadonlyArray<string>;
  jurisdictions: ReadonlyArray<string>;
  active: boolean;
  billing_rate_cents: number | null;
}

export interface CounselScore {
  counsel_id: string;
  score: number;                            // 0..100
  jurisdiction_match: 'exact' | 'state_country' | 'country_only' | 'none';
  specialty_match_count: number;
  reasons: string[];
}

function jurisdictionMatch(case_jur: string | null, counsel_jurs: ReadonlyArray<string>): CounselScore['jurisdiction_match'] {
  if (!case_jur) return 'none';
  if (counsel_jurs.includes(case_jur)) return 'exact';
  const country = case_jur.split('-')[0];
  const stateMatches = counsel_jurs.filter((j) => j.startsWith(`${country}-`));
  if (stateMatches.length > 0) return 'state_country';
  if (counsel_jurs.includes(country)) return 'country_only';
  return 'none';
}

export function scoreCounselForCase(req: CaseRouteRequest, c: CounselCandidate): CounselScore {
  const reasons: string[] = [];
  if (!c.active) {
    return { counsel_id: c.counsel_id, score: 0, jurisdiction_match: 'none', specialty_match_count: 0, reasons: ['inactive'] };
  }

  const jm = jurisdictionMatch(req.jurisdiction, c.jurisdictions);
  let jurisdictionPoints = 0;
  if (jm === 'exact') { jurisdictionPoints = 50; reasons.push(`jurisdiction exact match (${req.jurisdiction})`); }
  else if (jm === 'state_country') { jurisdictionPoints = 30; reasons.push('same country, different state'); }
  else if (jm === 'country_only') { jurisdictionPoints = 20; reasons.push('country-level coverage only'); }
  else { reasons.push('no jurisdiction match'); }

  const specialtySet = new Set(c.specialty);
  const matchedSpecialties = req.required_specialties.filter((s) => specialtySet.has(s));
  const specialtyPoints = Math.min(50, matchedSpecialties.length * 25);
  if (matchedSpecialties.length > 0) reasons.push(`matched specialties: ${matchedSpecialties.join(', ')}`);
  else reasons.push('no required specialty match');

  return {
    counsel_id: c.counsel_id,
    score: jurisdictionPoints + specialtyPoints,
    jurisdiction_match: jm,
    specialty_match_count: matchedSpecialties.length,
    reasons,
  };
}

export function rankCounselForCase(req: CaseRouteRequest, candidates: ReadonlyArray<CounselCandidate>): CounselScore[] {
  return candidates
    .map((c) => scoreCounselForCase(req, c))
    .sort((a, b) => b.score - a.score);
}

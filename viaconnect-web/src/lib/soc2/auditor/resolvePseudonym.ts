// Prompt #122 P9: Pseudonym resolver (brute-force HMAC match).
//
// The P1 pseudonymize() function produces an irreversible HMAC-SHA256 of
// (packetUuid + context + realId) keyed by the per-packet Vault HMAC key.
// Given a pseudonym + packet HMAC key + a bounded candidate list of
// plausible real IDs, this module iterates the candidates, re-computes
// the HMAC for each, and returns the matching real ID.
//
// Resolution is only invoked AFTER Steve (compliance) and Thomas (legal)
// have both approved the request. The brute-force cost is bounded by the
// candidate set size — typically a few thousand rows per context.

import { pseudonymize } from '../redaction/pseudonymize';

export interface ResolverInput {
  /** The packet's stable UUID (Merkle-signed, known to auditor). */
  packetUuid: string;
  /** Pseudonym context token — must match the one used at packet build time. */
  context: string;
  /** The pseudonym the auditor wants resolved (26-char base32). */
  pseudonym: string;
  /** Raw HMAC key material loaded from Vault by the caller. */
  hmacKey: Buffer;
  /** Bounded list of candidate real IDs to iterate. */
  candidateIds: readonly string[];
}

export interface ResolverResult {
  matched: string[];
  candidatesChecked: number;
  /** True if more than one candidate produced the same pseudonym — impossible at 128 bits, but callers should be defensive. */
  collision: boolean;
}

/**
 * Iterate candidates, HMAC each, return matches. Pure function; no I/O.
 * Expected to be called by the API route AFTER dual approval is confirmed
 * and the Vault key has been loaded.
 */
export function resolvePseudonym(input: ResolverInput): ResolverResult {
  const target = input.pseudonym.trim().toUpperCase();
  const matched: string[] = [];
  let checked = 0;

  for (const id of input.candidateIds) {
    checked++;
    const candidatePseudonym = pseudonymize({
      packetUuid: input.packetUuid,
      context: input.context,
      realId: id,
      key: input.hmacKey,
    });
    if (candidatePseudonym === target) {
      matched.push(id);
      // Don't short-circuit — we want to detect collisions (should be impossible at 128 bits).
    }
  }

  return {
    matched,
    candidatesChecked: checked,
    collision: matched.length > 1,
  };
}

/**
 * Map from redaction-policy context tokens to (table, id_column) tuples.
 * Used by the candidate-fetcher to know where to look for each context.
 */
export const CONTEXT_TO_TABLE: Record<string, { table: string; idColumn: string }> = {
  user:               { table: 'profiles', idColumn: 'id' },
  practitioner:       { table: 'practitioners', idColumn: 'id' },
  finding:            { table: 'compliance_findings', idColumn: 'id' },
  incident:           { table: 'compliance_incidents', idColumn: 'id' },
  evidence_bundle:    { table: 'marshall_evidence_bundles', idColumn: 'id' },
  consent:            { table: 'consent_ledger', idColumn: 'id' },
  dsar:               { table: 'dsar_requests', idColumn: 'id' },
  vendor_baa:         { table: 'vendor_baas', idColumn: 'id' },
  signal:             { table: 'social_signals', idColumn: 'id' },
  precheck_session:   { table: 'precheck_sessions', idColumn: 'id' },
  precheck_finding:   { table: 'precheck_findings', idColumn: 'id' },
  receipt:            { table: 'precheck_clearance_receipts', idColumn: 'id' },
  gh_user:            { table: 'soc2_external_github_prs', idColumn: 'author_login' },
  vercel_user:        { table: 'soc2_external_vercel_deploys', idColumn: 'creator_login' },
  // listing_url context ships as part of the #124 SOC 2 collector and
  // resolves from the source_reference JSON; skip it here unless the auditor
  // flags this context specifically (handled by caller-supplied candidates).
  listing_url:        { table: 'counterfeit_evaluations', idColumn: 'source_reference' },
};

/** Return the list of known contexts that this resolver can handle. */
export function knownContexts(): string[] {
  return Object.keys(CONTEXT_TO_TABLE).sort();
}

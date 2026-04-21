// Prompt #105 Workstream C — recipient resolution with NDA + scope gate.

import type { BoardMemberRole, NDAStatus } from '../types';

export interface RecipientCandidate {
  memberId: string;
  displayName: string;
  role: BoardMemberRole;
  ndaStatus: NDAStatus;
  departureDate: string | null;
  boardReportingScope: string[];
  accessRevokedAt: string | null;
}

export type RecipientExclusionReason =
  | 'nda_not_on_file'
  | 'departed'
  | 'scope_mismatch'
  | 'access_revoked';

export interface RecipientResolution {
  eligible: RecipientCandidate[];
  excluded: Array<{ candidate: RecipientCandidate; reason: RecipientExclusionReason }>;
}

/** Pure: filter board members to those eligible for distribution of a
 *  pack with the given period_type. Exclusion reasons are enumerated
 *  so the admin UI can explain why a member was skipped. */
export function resolveEligibleRecipients(
  candidates: readonly RecipientCandidate[],
  periodType: string,
): RecipientResolution {
  const eligible: RecipientCandidate[] = [];
  const excluded: RecipientResolution['excluded'] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const c of candidates) {
    if (c.accessRevokedAt !== null) {
      excluded.push({ candidate: c, reason: 'access_revoked' });
      continue;
    }
    if (c.departureDate !== null && c.departureDate <= today) {
      excluded.push({ candidate: c, reason: 'departed' });
      continue;
    }
    if (c.ndaStatus !== 'on_file') {
      excluded.push({ candidate: c, reason: 'nda_not_on_file' });
      continue;
    }
    if (!c.boardReportingScope.includes(periodType)) {
      excluded.push({ candidate: c, reason: 'scope_mismatch' });
      continue;
    }
    eligible.push(c);
  }

  return { eligible, excluded };
}

/** Pure: NDA-on-file guard — the single source of truth for
 *  "can this member receive a pack". The DB trigger enforces the
 *  same rule on insert; this helper is the client-side short-circuit. */
export function isNDAOnFile(ndaStatus: NDAStatus): boolean {
  return ndaStatus === 'on_file';
}

// Prompt #91 Phase 7: Patient invitation tokens.
//
// Pure helpers for token generation + URL construction. Mirrors the
// practitioner VIP invitation pattern from Phase 1 but writes to the
// existing practitioner_patients.invitation_token column rather than a
// dedicated table.

import { randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export function generatePatientInvitationToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function isPatientInvitationTokenShape(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  if (s.length < 32 || s.length > 256) return false;
  return TOKEN_PATTERN.test(s);
}

export function buildPatientInvitationUrl(
  baseUrl: string,
  token: string,
): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  return `${trimmed}/patients/invited?token=${token}`;
}

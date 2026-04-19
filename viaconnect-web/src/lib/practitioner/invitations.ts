// Practitioner VIP invitation tokens.
//
// Server-only module. Token = 32-byte base64url random string. Validation +
// optional one-time claim happens via the validate_practitioner_invitation
// security-definer RPC defined in 20260418000030_practitioner_invitations.sql.
//
// Pure helpers (generate / shape check) are safe to import from tests; the
// async helpers require a Supabase server client.

import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_EXPIRY_DAYS = 60;
const TOKEN_BYTES = 32;
// base64url alphabet: A-Z a-z 0-9 - _
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export function generateInvitationToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function isInvitationTokenShape(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  if (s.length < 32 || s.length > 256) return false;
  return TOKEN_PATTERN.test(s);
}

export interface InvitationCreateInput {
  invitedBy: string;
  targetEmail?: string;
  expectedCredentialType?: string;
  personalNote?: string;
  expiresAt?: Date;
}

export interface InvitationCreateResult {
  token: string;
  invitationUrl: string;
  expiresAt: string;
}

export async function generatePractitionerInvitation(
  input: InvitationCreateInput,
): Promise<InvitationCreateResult> {
  const token = generateInvitationToken();
  const expires =
    input.expiresAt ??
    new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const supabase = createClient();
  const { error } = await (supabase as any)
    .from('practitioner_invitations')
    .insert({
      token,
      invited_by: input.invitedBy,
      target_email: input.targetEmail ?? null,
      expected_credential_type: input.expectedCredentialType ?? null,
      personal_note: input.personalNote ?? null,
      expires_at: expires.toISOString(),
    });
  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://viacurawellness.com';
  return {
    token,
    invitationUrl: `${baseUrl.replace(/\/$/, '')}/practitioners/invited?token=${token}`,
    expiresAt: expires.toISOString(),
  };
}

export interface InvitationValidationResult {
  valid: boolean;
  targetEmail?: string;
  expectedCredentialType?: string;
  personalNote?: string;
  invitedByDisplay?: string;
  error?: string;
}

export async function validateInvitationToken(
  token: string,
  options: { claim?: boolean } = {},
): Promise<InvitationValidationResult> {
  if (!isInvitationTokenShape(token)) {
    return { valid: false, error: 'Malformed token.' };
  }

  const supabase = createClient();
  const { data, error } = await (supabase as any).rpc(
    'validate_practitioner_invitation',
    { p_token: token, p_claim: options.claim ?? false },
  );

  if (error) {
    return { valid: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.ok !== true) {
    return { valid: false, error: 'Invalid or expired invitation.' };
  }

  return {
    valid: true,
    targetEmail: row.target_email ?? undefined,
    expectedCredentialType: row.expected_credential_type ?? undefined,
    personalNote: row.personal_note ?? undefined,
    invitedByDisplay: row.invited_by_display ?? undefined,
  };
}

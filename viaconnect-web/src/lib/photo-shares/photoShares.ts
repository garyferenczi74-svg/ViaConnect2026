// Prompt 231b: user-facing management of practitioner access to body
// photos (photo_share_permissions). Data layer only; R5a-2 builds the UI on
// top of these exports.
//
// DESIGN: account-level sharing. photo_share_permissions.photo_session_id
// is NOT NULL, so every grant anchors to a specific body_photo_sessions row,
// but the storage RLS policy that actually gates photo reads is
// folder-scoped: one non-revoked row for a practitioner+user grants that
// practitioner read of ALL the user's body photos, not just the anchor
// session's. So the UX/semantics here are "share everything with
// practitioner X until expiry / revoke", not per-session sharing. A user
// can accumulate more than one row per practitioner across re-grants (each
// anchors to whatever session was most recent at grant time);
// groupSharesByPractitioner (photoShareGroup.ts) collapses those for
// display, and revokePhotoShare revokes every one of them for that
// practitioner in a single call, which is correct given the folder-scoped
// grant.
//
// The supabase client is passed in (not imported) so this module is
// testable without a live DB or Next.js request context; callers pass the
// server client from '@/lib/supabase/server' or the browser client from
// '@/lib/supabase/client'.
//
// Resilience: every read is raced against a timeout and fails open to an
// empty result with a structured log, never a thrown error. Writes
// (grant/revoke) are also timeout-raced, but a write cannot fail open to a
// false success — a timeout or error there returns an explicit
// { ok: false } result for the caller to surface.
//
// All calls are plain RLS-scoped client calls. The patient owns their rows
// via photo_session_user_id = auth.uid(); there is no admin client and no
// new RPC here.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { groupSharesByPractitioner, computeExpiry, type ShareGroupRow } from './photoShareGroup';
import type { ActivePhotoShare, ShareablePractitioner } from './types';

const SCOPE = 'photoShares';
const QUERY_TIMEOUT_MS = 4000;
const DEFAULT_EXPIRES_IN_DAYS = 30;

interface QueryError {
  message: string;
}

interface PractitionerLinkRow {
  practitioner_id: string | null;
}

interface LinksQueryResult {
  data: PractitionerLinkRow[] | null;
  error: QueryError | null;
}

interface PractitionerRow {
  user_id: string;
  display_name: string | null;
  patient_facing_display_name: string | null;
  practice_name: string | null;
}

interface PractitionersQueryResult {
  data: PractitionerRow[] | null;
  error: QueryError | null;
}

interface ShareRow {
  id: string;
  practitioner_id: string;
  granted_at: string;
  expires_at: string;
}

interface SharesQueryResult {
  data: ShareRow[] | null;
  error: QueryError | null;
}

interface SessionIdRow {
  id: string;
}

interface LatestSessionQueryResult {
  data: SessionIdRow[] | null;
  error: QueryError | null;
}

interface UpsertedShareRow {
  id: string;
  practitioner_id: string;
  granted_at: string;
  expires_at: string;
}

interface UpsertQueryResult {
  data: UpsertedShareRow | null;
  error: QueryError | null;
}

interface RevokeRow {
  id: string;
}

interface RevokeQueryResult {
  data: RevokeRow[] | null;
  error: QueryError | null;
}

interface PractitionerDisplay {
  displayName: string;
  practiceName: string | null;
}

/** Resolves practitioner_id -> { displayName, practiceName } for a set of ids. */
async function resolvePractitionerDisplays(
  supabase: SupabaseClient,
  practitionerIds: string[],
): Promise<Map<string, PractitionerDisplay>> {
  const map = new Map<string, PractitionerDisplay>();
  if (practitionerIds.length === 0) return map;

  const { data, error } = await withTimeout<PractitionersQueryResult>(
    Promise.resolve(
      supabase
        .from('practitioners')
        .select('user_id,display_name,patient_facing_display_name,practice_name')
        .in('user_id', practitionerIds),
    ) as unknown as Promise<PractitionersQueryResult>,
    QUERY_TIMEOUT_MS,
    `${SCOPE}.resolvePractitionerDisplays`,
  );
  if (error) {
    safeLog.warn(SCOPE, 'resolvePractitionerDisplays query error (fail-open)', {
      error,
      practitionerIds,
    });
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.user_id, {
      displayName: row.patient_facing_display_name ?? row.display_name ?? 'Practitioner',
      practiceName: row.practice_name ?? null,
    });
  }
  return map;
}

/**
 * Practitioners this user could share body photos with: their active
 * practitioner_patients links, resolved to public-facing practitioner
 * fields. Prefers patient_facing_display_name over display_name.
 */
export async function listShareablePractitioners(
  supabase: SupabaseClient,
  userId: string,
): Promise<ShareablePractitioner[]> {
  try {
    const { data, error } = await withTimeout<LinksQueryResult>(
      Promise.resolve(
        supabase
          .from('practitioner_patients')
          .select('practitioner_id')
          .eq('patient_id', userId)
          .eq('status', 'active'),
      ) as unknown as Promise<LinksQueryResult>,
      QUERY_TIMEOUT_MS,
      `${SCOPE}.listShareablePractitioners.links`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'listShareablePractitioners links query error (fail-open)', {
        error,
        userId,
      });
      return [];
    }

    const practitionerIds = Array.from(
      new Set(
        (data ?? [])
          .map((r) => r.practitioner_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    if (practitionerIds.length === 0) return [];

    const displays = await resolvePractitionerDisplays(supabase, practitionerIds);
    return practitionerIds
      .filter((id) => displays.has(id))
      .map((id) => {
        const display = displays.get(id) as PractitionerDisplay;
        return {
          practitionerId: id,
          displayName: display.displayName,
          practiceName: display.practiceName,
        };
      });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'listShareablePractitioners timed out (fail-open)', { userId });
    } else {
      safeLog.warn(SCOPE, 'listShareablePractitioners threw (fail-open)', { error, userId });
    }
    return [];
  }
}

/**
 * This user's currently active (non-revoked, non-expired) photo shares,
 * one entry per practitioner. Account-wide by construction: any active row
 * for a practitioner means that practitioner can read all of this user's
 * body photos (folder-scoped storage RLS), so this is the correct unit for
 * a "who can see my photos" list.
 */
export async function listActivePhotoShares(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActivePhotoShare[]> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await withTimeout<SharesQueryResult>(
      Promise.resolve(
        supabase
          .from('photo_share_permissions')
          .select('id,practitioner_id,granted_at,expires_at')
          .eq('photo_session_user_id', userId)
          .is('revoked_at', null)
          .gt('expires_at', nowIso),
      ) as unknown as Promise<SharesQueryResult>,
      QUERY_TIMEOUT_MS,
      `${SCOPE}.listActivePhotoShares.shares`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'listActivePhotoShares query error (fail-open)', { error, userId });
      return [];
    }

    const rows = data ?? [];
    if (rows.length === 0) return [];

    const practitionerIds = Array.from(new Set(rows.map((r) => r.practitioner_id)));
    const displays = await resolvePractitionerDisplays(supabase, practitionerIds);

    const shareRows: ShareGroupRow[] = rows.map((row) => {
      const display = displays.get(row.practitioner_id);
      return {
        id: row.id,
        practitioner_id: row.practitioner_id,
        granted_at: row.granted_at,
        expires_at: row.expires_at,
        displayName: display?.displayName ?? 'Practitioner',
        practiceName: display?.practiceName ?? null,
      };
    });

    return groupSharesByPractitioner(shareRows);
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'listActivePhotoShares timed out (fail-open)', { userId });
    } else {
      safeLog.warn(SCOPE, 'listActivePhotoShares threw (fail-open)', { error, userId });
    }
    return [];
  }
}

async function findLatestSessionId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await withTimeout<LatestSessionQueryResult>(
    Promise.resolve(
      supabase
        .from('body_photo_sessions')
        .select('id')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
        .limit(1),
    ) as unknown as Promise<LatestSessionQueryResult>,
    QUERY_TIMEOUT_MS,
    `${SCOPE}.grantPhotoShare.latestSession`,
  );
  if (error) {
    safeLog.warn(SCOPE, 'findLatestSessionId query error (fail-open to no_photos)', {
      error,
      userId,
    });
    return null;
  }
  const row = (data ?? [])[0];
  return row ? row.id : null;
}

export interface GrantPhotoShareOptions {
  expiresInDays?: number;
}

export interface GrantedPhotoShare {
  id: string;
  practitionerId: string;
  grantedAt: string;
  expiresAt: string;
}

export type GrantPhotoShareResult =
  | { ok: true; share: GrantedPhotoShare }
  | { ok: false; reason: 'no_photos' | 'error' };

/**
 * Shares ALL of this user's body photos with a practitioner until expiry.
 * Anchors the required photo_session_id to the user's most recent
 * body_photo_sessions row; if the user has never captured photos, there is
 * nothing to anchor to and this returns { ok: false, reason: 'no_photos' }.
 *
 * Upserts on the (photo_session_id, practitioner_id) unique constraint so a
 * repeat grant for the same pair (including a previously revoked or
 * expired one) re-activates in place: revoked_at is cleared, granted_at and
 * expires_at are refreshed. A grant against a different (newer) session for
 * the same practitioner inserts a new row rather than colliding; that is
 * fine because listActivePhotoShares/groupSharesByPractitioner collapse
 * every row for a practitioner into one entry, and revokePhotoShare revokes
 * all of them together.
 */
export async function grantPhotoShare(
  supabase: SupabaseClient,
  userId: string,
  practitionerId: string,
  opts?: GrantPhotoShareOptions,
): Promise<GrantPhotoShareResult> {
  try {
    const latestSessionId = await findLatestSessionId(supabase, userId);
    if (!latestSessionId) {
      return { ok: false, reason: 'no_photos' };
    }

    const nowIso = new Date().toISOString();
    const expiresAt = computeExpiry(nowIso, opts?.expiresInDays ?? DEFAULT_EXPIRES_IN_DAYS);

    const { data, error } = await withTimeout<UpsertQueryResult>(
      Promise.resolve(
        supabase
          .from('photo_share_permissions')
          .upsert(
            {
              photo_session_user_id: userId,
              photo_session_id: latestSessionId,
              practitioner_id: practitionerId,
              granted_at: nowIso,
              expires_at: expiresAt,
              revoked_at: null,
            },
            { onConflict: 'photo_session_id,practitioner_id' },
          )
          .select('id,practitioner_id,granted_at,expires_at')
          .single(),
      ) as unknown as Promise<UpsertQueryResult>,
      QUERY_TIMEOUT_MS,
      `${SCOPE}.grantPhotoShare.upsert`,
    );
    if (error || !data) {
      safeLog.warn(SCOPE, 'grantPhotoShare upsert error', { error, userId, practitionerId });
      return { ok: false, reason: 'error' };
    }

    return {
      ok: true,
      share: {
        id: data.id,
        practitionerId: data.practitioner_id,
        grantedAt: data.granted_at,
        expiresAt: data.expires_at,
      },
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'grantPhotoShare timed out', { userId, practitionerId });
    } else {
      safeLog.warn(SCOPE, 'grantPhotoShare threw', { error, userId, practitionerId });
    }
    return { ok: false, reason: 'error' };
  }
}

export type RevokePhotoShareResult = { ok: true; count: number } | { ok: false; reason: 'error' };

/**
 * Revokes this practitioner's access to ALL of this user's body photos:
 * every non-revoked photo_share_permissions row for this owner+practitioner
 * pair is stamped revoked_at, not just the row for the latest session. This
 * is account-wide by design, matching the folder-scoped storage grant (any
 * one active row was already enough for the practitioner to read
 * everything, so every one of them must be revoked to actually cut access).
 */
export async function revokePhotoShare(
  supabase: SupabaseClient,
  userId: string,
  practitionerId: string,
): Promise<RevokePhotoShareResult> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await withTimeout<RevokeQueryResult>(
      Promise.resolve(
        supabase
          .from('photo_share_permissions')
          .update({ revoked_at: nowIso })
          .eq('photo_session_user_id', userId)
          .eq('practitioner_id', practitionerId)
          .is('revoked_at', null)
          .select('id'),
      ) as unknown as Promise<RevokeQueryResult>,
      QUERY_TIMEOUT_MS,
      `${SCOPE}.revokePhotoShare`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'revokePhotoShare update error', { error, userId, practitionerId });
      return { ok: false, reason: 'error' };
    }
    return { ok: true, count: (data ?? []).length };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'revokePhotoShare timed out', { userId, practitionerId });
    } else {
      safeLog.warn(SCOPE, 'revokePhotoShare threw', { error, userId, practitionerId });
    }
    return { ok: false, reason: 'error' };
  }
}

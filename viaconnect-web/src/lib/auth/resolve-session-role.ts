/**
 * Server-side profiles.role lookup. Never reads user_metadata or email
 * to grant clinician/admin access. Timeout/error -> consumer (least privilege).
 */

import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import {
  roleFromProfilesColumn,
  type SessionRole,
} from "@/lib/auth/session-role";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedSession = {
  role: SessionRole;
  profileRole: string | undefined;
  lookupFailed: boolean;
};

type ProfileRoleRow = { role: string | null };

export async function lookupProfilesRole(
  supabase: SupabaseClient,
  userId: string,
  scope: string,
): Promise<{ profileRole: string | undefined; lookupFailed: boolean }> {
  try {
    const profileRole = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (error) {
          safeLog.warn(scope, "profiles.role query error", { userId, error });
          return undefined;
        }
        const row = data as ProfileRoleRow | null;
        return row?.role ?? undefined;
      })(),
      1500,
      `${scope}.profiles.role`,
    );
    return { profileRole, lookupFailed: false };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(scope, "profiles.role lookup timed out, failing closed to consumer", {
        userId,
        error,
      });
    } else {
      safeLog.error(scope, "profiles.role lookup failed, failing closed to consumer", {
        userId,
        error,
      });
    }
    return { profileRole: undefined, lookupFailed: true };
  }
}

export async function resolveSessionRoleForUser(
  supabase: SupabaseClient,
  user: User,
  scope = "auth.session-role",
): Promise<ResolvedSession> {
  const { profileRole, lookupFailed } = await lookupProfilesRole(
    supabase,
    user.id,
    scope,
  );
  return {
    role: roleFromProfilesColumn(profileRole),
    profileRole,
    lookupFailed,
  };
}

export async function resolveSessionRole(
  scope = "auth.session-role",
): Promise<ResolvedSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return resolveSessionRoleForUser(supabase, user, scope);
}

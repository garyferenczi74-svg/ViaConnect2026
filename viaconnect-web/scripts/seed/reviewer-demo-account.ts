// VIA-12: create or update one confirmed App Review account.
//
// Idempotent. Reads credentials from the environment. Does not print them.
// Writes a labelled profile and a terms/privacy consent row only.
// Does not write health, lab, genetic, dose, score, or product rows.
//
// Run from viaconnect-web (Gary only; do not point this at a project
// unless you intend to create the account there):
//
//   SUPABASE_URL="$SUPABASE_URL" \
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
//   REVIEWER_EMAIL="$REVIEWER_EMAIL" \
//   REVIEWER_PASSWORD="$REVIEWER_PASSWORD" \
//   npx tsx scripts/seed/reviewer-demo-account.ts
//
// NEXT_PUBLIC_SUPABASE_URL is accepted in place of SUPABASE_URL.
// After it prints user_id, set these on the server that serves the app.
// The payment block stays off until the flag is exactly true:
//
//   REVIEWER_PAYMENT_BLOCK_ENABLED=true
//   REVIEWER_USER_IDS=<user_id from this script>
//
// The seed also sets app_metadata.reviewer to true. Either signal is
// enough once the flag is on.

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";
import {
  ReviewerEmailAlreadyRegisteredError,
  buildSampleProfilePatch,
  isUniqueViolation,
  readReviewerCredentials,
  seedReviewerDemoAccount,
  type ReviewerAuthUser,
  type SampleConsentRow,
  type SampleProfilePatch,
} from "../../src/lib/reviewer/demo-account";

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function appMetadataFromUser(user: User): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  const source = user.app_metadata;
  if (!source || typeof source !== "object") return copy;
  for (const [key, value] of Object.entries(source)) {
    copy[key] = value;
  }
  return copy;
}

function toReviewerAuthUser(user: User): ReviewerAuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    appMetadata: appMetadataFromUser(user),
  };
}

function requireUser(user: User | null, action: string): User {
  if (!user?.id) throw new Error(`Auth admin ${action} returned no user.`);
  return user;
}

async function findAuthUserByEmail(
  admin: SupabaseClient<Database>["auth"]["admin"],
  email: string,
): Promise<ReviewerAuthUser | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`Auth user lookup failed: ${error.message}`);
    const users = data.users;
    const matches = users.filter((user) => (user.email ?? "").toLowerCase() === target);
    if (matches.length > 1) {
      throw new Error(
        "More than one auth user matches REVIEWER_EMAIL. Stopped without writing.",
      );
    }
    if (matches.length === 1) {
      const match = matches[0];
      if (!match) return null;
      return toReviewerAuthUser(match);
    }
    if (users.length < PAGE_SIZE) return null;
  }
  throw new Error(
    "Auth user lookup stopped after the page cap. No account was created. Confirm REVIEWER_EMAIL is new, or raise the lookup cap in scripts/seed/reviewer-demo-account.ts.",
  );
}

function isAlreadyRegisteredMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") &&
    (normalized.includes("registered") || normalized.includes("exists"))
  );
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required.");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");

  const credentials = readReviewerCredentials(process.env);
  const acceptedAtIso = new Date().toISOString();
  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = supabase.auth.admin;

  const result = await seedReviewerDemoAccount({
    credentials,
    acceptedAtIso,
    auth: {
      findByEmail: (email) => findAuthUserByEmail(admin, email),
      async createConfirmedUser(input) {
        const { data, error } = await admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          app_metadata: input.appMetadata,
          user_metadata: input.userMetadata,
        });
        if (error) {
          if (isAlreadyRegisteredMessage(error.message)) {
            throw new ReviewerEmailAlreadyRegisteredError();
          }
          throw new Error(`Could not create the reviewer auth user: ${error.message}`);
        }
        return toReviewerAuthUser(requireUser(data.user, "createUser"));
      },
      async updateConfirmedUser(input) {
        const { data, error } = await admin.updateUserById(input.id, {
          password: input.password,
          email_confirm: true,
          app_metadata: input.appMetadata,
          user_metadata: input.userMetadata,
        });
        if (error) {
          throw new Error(`Could not update the reviewer auth user: ${error.message}`);
        }
        return toReviewerAuthUser(requireUser(data.user, "updateUserById"));
      },
    },
    profiles: {
      writeSampleProfile: (userId, patch) => writeSampleProfile(supabase, userId, patch),
      ensureConsent: (row) => ensureConsent(supabase, row),
    },
  });

  console.log(
    JSON.stringify(
      {
        user_id: result.userId,
        email: result.email,
        auth_action: result.authAction,
        profile_action: result.profileAction,
        consent_action: result.consentAction,
        health_data_seeded: result.healthDataSeeded,
        app_metadata_reviewer: result.appMetadataReviewer,
        payment_block:
          "Still off until REVIEWER_PAYMENT_BLOCK_ENABLED=true. Also set REVIEWER_USER_IDS to this user_id.",
      },
      null,
      2,
    ),
  );
}

async function writeSampleProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  patch: SampleProfilePatch,
): Promise<"inserted" | "updated"> {
  const labelled = buildSampleProfilePatch();
  if (
    labelled.full_name !== patch.full_name ||
    labelled.role !== patch.role ||
    labelled.onboarding_completed !== patch.onboarding_completed
  ) {
    throw new Error("Refusing to write a profile patch that is not the sample label.");
  }

  const existing = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing.error) {
    throw new Error(`Could not read profiles: ${existing.error.message}`);
  }
  if (existing.data) {
    const updated = await supabase.from("profiles").update(patch).eq("id", userId);
    if (updated.error) throw new Error(`Could not update profiles: ${updated.error.message}`);
    return "updated";
  }

  const inserted = await supabase.from("profiles").insert({ id: userId, ...patch });
  if (inserted.error) {
    if (isUniqueViolation(inserted.error)) {
      const updated = await supabase.from("profiles").update(patch).eq("id", userId);
      if (updated.error) throw new Error(`Could not update profiles: ${updated.error.message}`);
      return "updated";
    }
    throw new Error(`Could not insert profiles: ${inserted.error.message}`);
  }
  return "inserted";
}

async function ensureConsent(
  supabase: SupabaseClient<Database>,
  row: SampleConsentRow,
): Promise<"inserted" | "already_present"> {
  const existing = await supabase
    .from("user_consents")
    .select("user_id")
    .eq("user_id", row.user_id)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`Could not read user_consents: ${existing.error.message}`);
  }
  if (existing.data) return "already_present";

  const inserted = await supabase.from("user_consents").insert(row);
  if (inserted.error) {
    if (isUniqueViolation(inserted.error)) return "already_present";
    throw new Error(`Could not insert user_consents: ${inserted.error.message}`);
  }
  return "inserted";
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Reviewer seed failed.";
  console.error(message);
  process.exit(1);
});

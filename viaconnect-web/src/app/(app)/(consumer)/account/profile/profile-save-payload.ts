/**
 * src/app/(app)/(consumer)/account/profile/profile-save-payload.ts
 *
 * Prompt 210d P0-6: the account profile upsert payload, extracted from the
 * inline object literal in page.tsx handleProfileSave into a pure builder so
 * the write-shape test (src/lib/__tests__/profiles-write-shape.test.ts) can
 * assert its keys against the live profiles columns plus the P0-6 migration
 * columns ({phone, timezone}). It lives in a sibling module rather than as a
 * page.tsx export because Next.js validates the export fields of page files.
 *
 * Keys and value shaping are unchanged from the pre-210d inline literal:
 * full_name joins the trimmed name parts and falls back to null, phone trims
 * and falls back to null, updated_at is a fresh ISO timestamp.
 */

export interface ProfileSavePayload {
  id: string;
  full_name: string | null;
  phone: string | null;
  updated_at: string;
}

export function buildProfileSavePayload(input: {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
}): ProfileSavePayload {
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  return {
    id: input.userId,
    full_name: fullName || null,
    phone: input.phone.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

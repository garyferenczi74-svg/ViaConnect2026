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
 * Prompt 223 adds structured location columns plus location_needs_confirm:
 * false when the caller saves a complete selector.
 */

import {
  isCompleteStructuredLocation,
  signupLocationFieldsFromValue,
  signupLocationFieldsSchema,
} from "@/lib/location/signup-schema";
import type { StructuredLocation } from "@/lib/location/types";

export interface ProfileSavePayload {
  id: string;
  full_name: string | null;
  phone: string | null;
  updated_at: string;
  city?: string | null;
  subdivision_name?: string | null;
  subdivision_code?: string | null;
  country_name?: string | null;
  country_code?: string | null;
  location_is_free_entry?: boolean;
  location_needs_confirm?: boolean;
}

export function buildProfileSavePayload(input: {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  location?: StructuredLocation | null;
  subdivisionOptional?: boolean;
}): ProfileSavePayload {
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const payload: ProfileSavePayload = {
    id: input.userId,
    full_name: fullName || null,
    phone: input.phone.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const location = input.location ?? null;
  const subdivisionOptional = input.subdivisionOptional === true;
  if (isCompleteStructuredLocation(location, subdivisionOptional)) {
    payload.city = location.city.trim();
    payload.subdivision_name = location.subdivisionName?.trim() || null;
    payload.subdivision_code = location.subdivisionCode?.trim() || null;
    payload.country_name = location.countryName.trim();
    payload.country_code = location.countryCode.trim();
    payload.location_is_free_entry = location.isFreeEntry;
    payload.location_needs_confirm = false;
  }

  return payload;
}

/** Field error when the selector has a started, incomplete location. */
export function profileLocationSaveError(
  location: StructuredLocation | null,
  subdivisionOptional: boolean,
  needsConfirm: boolean,
): string | null {
  if (location === null) {
    return null;
  }
  if (isCompleteStructuredLocation(location, subdivisionOptional)) {
    return null;
  }
  if (needsConfirm) {
    return "Please confirm your location";
  }
  const parsed = signupLocationFieldsSchema.safeParse(
    signupLocationFieldsFromValue(location, subdivisionOptional),
  );
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Please complete your location";
  }
  return "Please complete your location";
}

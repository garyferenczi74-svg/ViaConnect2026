// Prompt 231b: pure grouping and date math for photo_share_permissions.
//
// Account-level sharing means a user can accumulate more than one
// non-revoked row per practitioner over time (each grant/re-grant anchors
// to whichever body_photo_sessions row was most recent at that moment, but
// storage RLS grants the practitioner ALL of the user's body photos
// regardless of which row it is). groupSharesByPractitioner collapses those
// rows into one ActivePhotoShare per practitioner: earliest grantedAt (when
// access first started), latest expiresAt (how long it still runs), and
// every underlying row id (so revoke/UI can reference them all). No DB
// calls here; this is deliberately pure so it is trivial to unit test.

import type { ActivePhotoShare } from './types';

export interface ShareGroupRow {
  id: string;
  practitioner_id: string;
  granted_at: string;
  expires_at: string;
  displayName: string;
  practiceName: string | null;
}

export function groupSharesByPractitioner(rows: ShareGroupRow[]): ActivePhotoShare[] {
  const byPractitioner = new Map<string, ActivePhotoShare>();

  for (const row of rows) {
    const existing = byPractitioner.get(row.practitioner_id);
    if (!existing) {
      byPractitioner.set(row.practitioner_id, {
        practitionerId: row.practitioner_id,
        displayName: row.displayName,
        practiceName: row.practiceName,
        grantedAt: row.granted_at,
        expiresAt: row.expires_at,
        rowIds: [row.id],
      });
      continue;
    }
    existing.rowIds.push(row.id);
    if (row.granted_at < existing.grantedAt) {
      existing.grantedAt = row.granted_at;
    }
    if (row.expires_at > existing.expiresAt) {
      existing.expiresAt = row.expires_at;
    }
  }

  return Array.from(byPractitioner.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

/** ISO timestamp `days` days after `nowIso`. Pure date math, no Date.now(). */
export function computeExpiry(nowIso: string, days: number): string {
  const base = new Date(nowIso).getTime();
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

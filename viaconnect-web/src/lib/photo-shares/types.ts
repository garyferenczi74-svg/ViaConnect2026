// Prompt 231b: shared types for practitioner access to a user's body
// photos (photo_share_permissions). Account-level sharing: because the
// storage RLS policy is folder-scoped, one non-revoked row for a
// practitioner+user grants that practitioner read of ALL the user's body
// photos, not just the session the row anchors to. See photoShares.ts.

export interface ShareablePractitioner {
  practitionerId: string;
  displayName: string;
  practiceName: string | null;
}

export interface ActivePhotoShare {
  practitionerId: string;
  displayName: string;
  practiceName: string | null;
  grantedAt: string;
  expiresAt: string;
  rowIds: string[];
}

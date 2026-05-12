// Verbatim copy constants for the Bio Optimization Score card rows.
//
// Extracted to a JSX-free module so the canonical strings can be
// asserted by Vitest in the node-only environment. The .tsx row
// components re-export from here so existing imports stay valid.
//
// These strings are LOCKED. They are reproduced verbatim from Gary's
// brief and locked again in #161e §6.4 + §6.5. Any change requires a
// new prompt with explicit Gary approval.

export const ACCURACY_ROW_HEADER = 'Improved Accuracy';

export const ACCURACY_ROW_DESCRIPTION =
  'CAQ improves accuracy to 72%, Labs improves accuracy to 86%, unlock Genetics improves accuracy to 96%.';

export const ENGAGEMENT_ROW_HEADER = 'How can I improve my score?';

export const ENGAGEMENT_ROW_DESCRIPTION =
  'Log nutrition, track supplements, record body measurements, sync wearables, connect plug-ins, and complete Helix Challenges. Each lever adds points to your score over time.';

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

export const ENGAGEMENT_ROW_HEADER = 'How can I improve my score?';

export const ENGAGEMENT_ROW_DESCRIPTION =
  'Every Daily Log In improves your Bio Optimization Score';

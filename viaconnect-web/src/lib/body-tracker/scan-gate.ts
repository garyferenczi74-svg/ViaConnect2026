// =============================================================================
// Body Scan client gate selection (Prompt #169a, realigned to the #169f TIER
// MODEL).
//
// Pure, I/O-free selection of WHICH client-facing surface a consumer sees at
// the body-scan guard points, given their entitlement. Extracted from the React
// components so the guard-point selection logic can be unit-tested as real
// behavior (the project's vitest config runs node-environment .test.ts only, so
// the testable contract lives here, not in JSX).
//
// Under the #169f four-tier Via Cura model, Body Scan (FormaVision) is
// Platinum-and-above only. The Free tier has NO scan and the old free teaser is
// RETIRED: a non-entitled user is shown a Platinum upgrade prompt, never a free
// teaser. The gate is therefore binary: ENTITLED (full scan) vs an upgrade
// prompt. The marketing copy for that prompt is owned by a separate gated task;
// this module only decides which surface, using minimal functional state names.
//
// This is a CLIENT convenience gate for UX / defense-in-depth only. The
// AUTHORITATIVE gate is the body_photo_sessions finalize trigger (migration
// 20260516000150), which enforces entitlement in-database whenever scan_status
// transitions to 'complete' and REJECTS a non-entitled user. The primary scan
// path (runScanAnalysis) finalizes via a direct client UPDATE and never calls
// the body-scan-analyze edge function, so the DB trigger (not the edge function)
// is what actually stops a consumer who manipulates client state from finalizing
// a scan they are not entitled to. The edge function and entitlement-check.ts
// remain a secondary, defense-in-depth layer for the edge path.
//
// The entitlement shape mirrors what GET /api/body-tracker/entitlement returns
// and what usePremiumEntitlement exposes.
// =============================================================================

export interface ScanGateEntitlement {
  // True when the consumer is entitled to the full Body Scan: an own Platinum or
  // above membership, an accepted family link to a platinum_family holder, OR a
  // verified practitioner-managed context. Either way they get the full, unlocked
  // scan experience. Anyone else (Free / Gold / no membership) is NOT entitled
  // and is routed to the Platinum upgrade prompt.
  entitled: boolean;
}

// The dashboard / entry guard point (spec section 3.1.a) resolves to exactly one
// of these surfaces:
//   'normal'            entitled consumer: render the normal scan entry untouched.
//   'upgrade_platinum'  non-entitled consumer: show the Platinum upgrade prompt.
export type ScanEntryGate = 'normal' | 'upgrade_platinum';

/**
 * Dashboard / entry guard point selection (spec section 3.1.a).
 *
 * Precedence:
 *   entitled       -> 'normal'
 *   not entitled   -> 'upgrade_platinum'
 */
export function selectScanEntryGate(entitlement: ScanGateEntitlement): ScanEntryGate {
  if (entitlement.entitled) return 'normal';
  return 'upgrade_platinum';
}

/**
 * Pre-capture guard point selection (spec section 3.1.b).
 *
 * Re-checks entitlement before allowing capture to begin (defense against client
 * state manipulation; the server still enforces at finalize). Returns whether
 * capture may proceed.
 *
 *   entitled       -> allowed (full capture, including any Tier 2 depth path)
 *   not entitled   -> blocked, route to the Platinum upgrade prompt
 *
 * NOTE: a Tier 2 capable but non-entitled device is NEVER silently downgraded.
 * A non-entitled consumer is sent to the Platinum upgrade prompt. The
 * "upgrade for depth-enhanced scanning" copy is owned by the capture surface;
 * this function only decides allow vs. block.
 */
export interface ScanCaptureGate {
  allowed: boolean;
}

export function selectScanCaptureGate(entitlement: ScanGateEntitlement): ScanCaptureGate {
  if (entitlement.entitled) return { allowed: true };
  return { allowed: false };
}

/**
 * Results upgrade guard point selection (spec section 3.1.c).
 *
 * After a scan, decides whether the premium-only result surfaces (the Compare
 * and Insights tabs) render unlocked or locked-with-upgrade-evidence.
 *
 *   entitled       -> unlocked (Compare + Insights available)
 *   not entitled   -> locked   (render the Platinum upgrade prompt with those
 *                               tabs visibly locked as the upgrade evidence)
 */
export interface ScanResultsGate {
  // True when the premium-only tabs (Compare, Insights) are unlocked.
  premiumTabsUnlocked: boolean;
  // True when the results-level Platinum upgrade prompt should be shown.
  showPaywall: boolean;
}

export function selectScanResultsGate(entitlement: ScanGateEntitlement): ScanResultsGate {
  if (entitlement.entitled) {
    return { premiumTabsUnlocked: true, showPaywall: false };
  }
  return { premiumTabsUnlocked: false, showPaywall: true };
}

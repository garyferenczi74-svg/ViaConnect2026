// =============================================================================
// Body Scan client gate selection (Prompt #169a, spec section 3.1).
//
// Pure, I/O-free selection of WHICH client-facing surface a consumer sees at
// the body-scan guard points, given their entitlement. Extracted from the React
// components so the guard-point selection logic can be unit-tested as real
// behavior (the project's vitest config runs node-environment .test.ts only, so
// the testable contract lives here, not in JSX).
//
// This is a CLIENT convenience gate for UX only. The authoritative gate is the
// server: src/lib/body-tracker/entitlement-check.ts (web) plus the three-point
// enforcement in the body-scan-analyze edge function at finalize. A consumer who
// manipulates client state still cannot finalize a scan they are not entitled to.
//
// The entitlement shape mirrors what GET /api/body-tracker/entitlement returns
// and what usePremiumEntitlement exposes.
// =============================================================================

export interface ScanGateEntitlement {
  // True when the consumer holds an active premium (paid) membership, OR the
  // surface is being viewed in a verified practitioner-managed context. Either
  // way the consumer gets the full, unlocked scan experience.
  premium: boolean;
  // True once the one-time free body scan teaser has been claimed by this user
  // (profiles.free_body_scan_used).
  freeTeaserUsed: boolean;
}

// The dashboard / entry guard point (spec section 3.1.a) resolves to exactly one
// of these surfaces:
//   'normal'        premium consumer: render the normal scan entry untouched.
//   'free_teaser'   non-premium consumer who has NOT used the teaser: invite
//                   them to try their first Body Scan free.
//   'paywall'       non-premium consumer who HAS used the teaser: show the
//                   premium upgrade paywall.
export type ScanEntryGate = 'normal' | 'free_teaser' | 'paywall';

/**
 * Dashboard / entry guard point selection (spec section 3.1.a).
 *
 * Precedence:
 *   premium                       -> 'normal'
 *   non-premium + teaser unused   -> 'free_teaser'
 *   non-premium + teaser used     -> 'paywall'
 */
export function selectScanEntryGate(entitlement: ScanGateEntitlement): ScanEntryGate {
  if (entitlement.premium) return 'normal';
  if (!entitlement.freeTeaserUsed) return 'free_teaser';
  return 'paywall';
}

/**
 * Pre-capture guard point selection (spec section 3.1.b).
 *
 * Re-checks entitlement before allowing capture to begin (defense against client
 * state manipulation; the server still enforces at finalize). Returns whether
 * capture may proceed, and when it may NOT, whether the reason is a spent free
 * teaser (so the caller can decide which message to surface).
 *
 *   premium                       -> allowed (full capture, including any
 *                                     Tier 2 depth-enhanced path)
 *   non-premium + teaser unused   -> allowed (the one free teaser scan)
 *   non-premium + teaser used     -> blocked, route to the paywall
 *
 * NOTE: a Tier 2 capable but non-premium device is NEVER silently downgraded.
 * The non-premium consumer either spends their free teaser (Tier 1 result) or,
 * if it is already spent, is sent to the paywall with an upgrade prompt. The
 * "upgrade for depth-enhanced scanning" copy is owned by the capture surface;
 * this function only decides allow vs. block and why.
 */
export interface ScanCaptureGate {
  allowed: boolean;
  // When blocked, true means the free teaser is already spent (=> paywall).
  teaserExhausted: boolean;
}

export function selectScanCaptureGate(entitlement: ScanGateEntitlement): ScanCaptureGate {
  if (entitlement.premium) return { allowed: true, teaserExhausted: false };
  if (!entitlement.freeTeaserUsed) return { allowed: true, teaserExhausted: false };
  return { allowed: false, teaserExhausted: true };
}

/**
 * Results upgrade guard point selection (spec section 3.1.c).
 *
 * After a scan, decides whether the premium-only result surfaces (the Compare
 * and Insights tabs) render unlocked or locked-with-paywall-evidence.
 *
 *   premium      -> unlocked (Compare + Insights available)
 *   non-premium  -> locked   (render the paywall with those tabs visibly locked
 *                             as the upgrade evidence)
 */
export interface ScanResultsGate {
  // True when the premium-only tabs (Compare, Insights) are unlocked.
  premiumTabsUnlocked: boolean;
  // True when the results-level paywall upgrade card should be shown.
  showPaywall: boolean;
}

export function selectScanResultsGate(entitlement: ScanGateEntitlement): ScanResultsGate {
  if (entitlement.premium) {
    return { premiumTabsUnlocked: true, showPaywall: false };
  }
  return { premiumTabsUnlocked: false, showPaywall: true };
}

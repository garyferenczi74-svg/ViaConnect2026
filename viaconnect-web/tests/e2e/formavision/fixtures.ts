// FormaVision E2E fixtures + capability helpers (Prompt 210e, Task E3).
//
// EXECUTION-GATING NOTE (read before running): the FormaVision cinematic avatar
// gates on hasWebGL() (see src/components/formavision/hasWebGL.ts) and a live GL
// context. In a headless agent runner there is no GL-capable browser, so the
// cinematic (@cinematic) path is SKIPPED and the 2D-floor + a11y (@fallback) path
// runs. A green cinematic run requires the GL CI environment. Nothing here starts
// a dev server; playwright.config.ts expects one already listening at
// PLAYWRIGHT_BASE_URL. See tests/e2e/formavision/journey.spec.ts for the trace.
//
// EVERYTHING IN THIS FILE IS SYNTHETIC AND LABELLED SYNTHETIC. No real member data
// is used or fabricated into the product: the vectors below are named-synthetic
// input shapes used only to document how a seeded fixture user WOULD drive the
// avatar. The running app reads its own canonical composition; these constants are
// test-authoring scaffolding, not a data source the UI consumes.

import type { Page } from '@playwright/test';

// The consumer surface under test. The My Biology hub links here; this is the
// real /body-tracker/composition avatar surface (composition/page.tsx).
export const COMPOSITION_PATH = '/body-tracker/composition';

// ---------------------------------------------------------------------------
// Capability probe forcing (the honest fallback lever)
// ---------------------------------------------------------------------------
//
// hasWebGL() builds a throwaway <canvas> and asks for a 'webgl2' / 'webgl' /
// 'experimental-webgl' context; a null result means "no WebGL" and the surface
// drops to the guaranteed 2D floor. To make the WebGL-fail path DETERMINISTIC and
// runnable headless, we stub HTMLCanvasElement.prototype.getContext so that any GL
// context request returns null while 2D requests pass through untouched. This is
// installed via page.addInitScript so it runs before any app script, exactly as a
// GL-blocklisted / GL-disabled browser would behave. It forces fellBack -> true in
// BodyCompositionAvatar and renders the SegmentalHeatMap floor with numbers intact.
export async function forceWebGLUnavailable(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype;
    const original = proto.getContext;
    // Preserve 2D and bitmaprenderer; deny every WebGL flavour.
    const deniedContexts = new Set<string>([
      'webgl',
      'webgl2',
      'experimental-webgl',
      'experimental-webgl2',
    ]);
    // The cast keeps the many getContext overloads satisfied without using any:
    // the wrapper forwards every call and only special-cases the GL context ids.
    const patched = function patchedGetContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...rest: unknown[]
    ): unknown {
      if (deniedContexts.has(contextId)) {
        return null;
      }
      return (original as (id: string, ...args: unknown[]) => unknown).call(
        this,
        contextId,
        ...rest,
      );
    };
    Object.defineProperty(proto, 'getContext', {
      configurable: true,
      writable: true,
      value: patched,
    });
  });
}

// Detect at runtime whether the live browser actually produced a cinematic 3D
// canvas inside the avatar container. FormaVisionCanvas mounts an r3f <Canvas>,
// which renders a real <canvas> element; the 2D floor never does. This is the
// honest, capability-dependent discriminator used to skip @cinematic steps when
// the environment has no GL (headless). It reads live DOM, it does not force
// anything. Note: the avatar container testid is 'avatar-container' (present on
// composition/page.tsx); the 3D canvas element itself carries no testid today
// (see the "testids to add" list in the E3 report).
export async function cinematicCanvasIsUp(page: Page): Promise<boolean> {
  return page
    .locator('[data-testid="avatar-container"] canvas')
    .first()
    .isVisible()
    .catch(() => false);
}

// ---------------------------------------------------------------------------
// Synthetic param-vector fixtures (LABELLED SYNTHETIC)
// ---------------------------------------------------------------------------
//
// These mirror the BodyParamVector-adjacent shape the surface derives from a
// composition scan (scanToParamVector). They are NOT imported by the product and
// NOT written to any store here; they document the numbers a seeded fixture user
// would carry so a reader can see what the journey asserts against. Two captures
// (first + latest) are the minimum the Time Machine needs to leave its honest
// single-scan invite and show a real two-point journey.
export interface SyntheticCompositionCapture {
  readonly label: string;
  readonly recordedAt: string;
  readonly totalBodyFatPct: number;
  readonly waistIn: number;
}

// Oldest-first, exactly as composHistory.snapshots is ordered on the surface.
export const SYNTHETIC_JOURNEY_CAPTURES: readonly SyntheticCompositionCapture[] = [
  {
    label: 'synthetic-first-capture',
    recordedAt: '2026-01-06T00:00:00.000Z',
    totalBodyFatPct: 24.4,
    waistIn: 36.0,
  },
  {
    label: 'synthetic-latest-capture',
    recordedAt: '2026-06-06T00:00:00.000Z',
    totalBodyFatPct: 21.1,
    waistIn: 34.0,
  },
] as const;

// ---------------------------------------------------------------------------
// Fixture-scan seeding approach (documented, not executed here)
// ---------------------------------------------------------------------------
//
// The Section-7 trace needs a fixture user with >= 2 real composition scans so
// the readouts, Notable Changes, and Time Machine leave their honest single-scan
// invites. There are two seeding strategies, both keeping the "fixtures are
// labelled fixtures, nothing is fabricated into the product" rule:
//
//   1. Storage-state fixture (preferred for CI): a Playwright storageState.json
//      captured once for a dedicated seeded synthetic account (never a real
//      member). The account's scans are inserted via a server-side seed script /
//      Supabase seed migration tagged synthetic, so the app reads its own
//      canonical path and no vector above is ever injected into the DOM. Wire it
//      via `test.use({ storageState: '<path>' })` in a seeded describe block.
//
//   2. Network fixture-scan stub (hermetic, GL CI): page.route the composition /
//      circumference history endpoints to return the SYNTHETIC_JOURNEY_CAPTURES
//      shaped as the hooks expect (useCompositionHistory / useCircumferenceHistory).
//      This keeps the run offline and deterministic for visual-regression baselines.
//
// This helper is intentionally inert: it documents the seam and returns the label
// set so a seeded spec can assert it wired the intended synthetic captures. It
// performs no navigation and no injection on its own.
export function describeFixtureScanSeed(): readonly string[] {
  return SYNTHETIC_JOURNEY_CAPTURES.map((c) => c.label);
}

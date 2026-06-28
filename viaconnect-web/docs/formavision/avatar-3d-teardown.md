# FormaVision 3D Avatar Teardown

Prompt 210b, Phase 7 Performance Profile (P7-T3).
Static analysis only. Real-device gate items are enumerated in the checklist below;
none of them is verified here.

---

## Competitive Teardown

_Placeholder. Not written in this phase. Will compare FormaVision render cost,
feature surface, and degradation story against peer body-composition visualizers
(ZOZOFIT, Fit3D, Styku, DEXA-adjacent apps) when Gary commissions that work._

---

## Performance Profile (P7-T3)

### 1. Asset Budget

**Body geometry: code-generated, zero download.**
`mountBodyGeometry.ts:73` calls `buildBodyGeometry(param, opts.build)`, which
generates a parametric body from a `BodyParamVector` entirely in-process. The
indexed geometry is converted to a non-indexed clone via `.toNonIndexed()` at
`mountBodyGeometry.ts:78`, the barycentric attribute is baked at line 80, and
bounds are computed at line 83. No `.glb`, `.obj`, or any external mesh asset
is fetched at any point in the mount path. Confirmed.

**cellTexture DataTexture: 16 KB in-process, zero download.**
`cellTexture.ts:27` (`makeCellTexture`) builds a `THREE.DataTexture` from a
`Uint8Array` computed with a CPU softpipe dot-grain loop. Default size is 64x64
RGBA, which is 64 * 64 * 4 = 16,384 bytes, entirely in JS heap before GPU
upload. `RepeatWrapping`, `LinearFilter`, `generateMipmaps: false` at lines
63-73. No network fetch is involved, so KTX2 and Basis-Universal compression are
not applicable and are correctly omitted by design. Confirmed.

**Lazy `ssr:false` split keeps THREE out of first paint.**
`FormaVision3DAvatar.tsx:53-56`:

```ts
const FormaVisionCanvas = dynamic(() => import('./FormaVisionCanvas'), {
  ssr: false,
  loading: () => <CanvasLoader />,
});
```

The `dynamic` import with `ssr: false` means the entire THREE / r3f / drei
bundle is excluded from the SSR pass and from the first-paint critical path.
`FormaVision3DAvatar` itself is also dynamic-imported (ssr:false) at its call
site. The `CanvasLoader` spinner is a pure DOM stub. Confirmed.

---

### 2. Frame Budget

**Demand loop: no continuous render.**
`FormaVisionCanvas.tsx:655`: `frameloop="demand"` on the `<Canvas>`. Frames are
produced only when `invalidate()` is explicitly called (on mount, on data change,
on interaction) or when OrbitControls fires its `onChange` event (which drei's
OrbitControls calls `invalidate()` internally). When the avatar is idle and not
being interacted with, zero frames are produced. Confirmed.

`VisibilityPump` (`FormaVisionCanvas.tsx:537-577`) wires two guards:

- `visibilitychange`: invalidates only when `document.visibilityState === 'visible'`
  (line 543). Tab becoming hidden produces no frame.
- `IntersectionObserver` at threshold 0.01 (line 558): invalidates only when the
  canvas re-enters the viewport. Scrolled-offscreen state produces no frame.

Both guards correctly call `invalidate()` on RE-ENTRY only, not on exit.
Confirmed offscreen pause.

**FrameBudgetMonitor: demand-safe, never promotes to continuous render.**
`FormaVisionCanvas.tsx:589-630`. The `useFrame` hook at line 611 fires only on
frames that the demand loop already produced. The monitor explicitly never calls
`invalidate()` (comment at line 584-588; confirmed by code inspection: no
`invalidate` reference in the function body). A `useFrame` priority-0 callback
under `frameloop="demand"` is a passive observer, not a frame pump. Confirmed
demand-loop safe.

Sampler constants (`frameBudgetMonitor.ts`):

| Constant | Value | Rationale |
|---|---|---|
| `DEFAULT_FRAME_BUDGET_MS` (line 22) | 34 ms | Just below 30 fps; 16.7 ms (60 fps) never trips it |
| `DEFAULT_IDLE_GAP_MS` (line 27) | 250 ms | Inter-frame gap larger than this is idle, not a slow frame |
| `DEFAULT_OVER_BUDGET_WINDOW` (line 31) | 20 frames | Sustained consecutive streak required; transient hitches do not step down |

Hysteresis: `frameBudgetMonitor.ts:80-83` resets `consecutive` to zero on ANY
good frame, so the 20-frame window must be an unbroken run. One-shot per tier:
`firedRef` in `FrameBudgetMonitor` (line 604) prevents double-stepping off a
stale streak; it resets on tier change (lines 605-609). Step-down is then relayed
to `RenderTierProvider` (`RenderTierProvider.tsx:60-62`) via `stepTierDown`
(sticky, never steps up). Confirmed.

**DPR scaling per tier.**
`tierCost.ts:17-24` (`dprForTier`):

| Tier | DPR range | Fill-rate effect |
|---|---|---|
| cinematic | [1, 2] | Byte-identical to before P7-T2 |
| lite | [1, 1.5] | Up to 44% fragment-shader cost reduction vs 2x on a high-DPR phone |

`FormaVisionCanvas.tsx:661`: `dpr={dprForTier(props.renderTier ?? 'cinematic')}`.
Confirmed.

**Geometry density per tier.**
`FormaVisionCanvas.tsx:108-111` (`TIER_BUILD`):

| Tier | radialSegments | verticalSegments | Approx vertex grid |
|---|---|---|---|
| cinematic | 40 | 48 | 1,920 per ring-stack |
| lite | 28 | 28 | 784 per ring-stack |

Lite roughly halves the raw vertex count. The capable/cinematic path is
unchanged; lite trims cost by re-keying `buildOptions` only (topology change
triggers a controlled remount rather than an in-flight geometry mutation).
Confirmed.

**EmphasisParticles suppressed on lite.**
`FormaVisionCanvas.tsx:703`: `showParticlesForTier(props.renderTier ?? 'cinematic')`
gates the `<EmphasisParticles>` mount. `tierCost.ts:32-34`: `showParticlesForTier`
returns `false` on lite. All data layers (MeasurementRing, MeasurementCallouts,
GhostMesh, overlay tints) remain mounted on lite; only the decorative 14-point
additive burst is suppressed. Cinematic is byte-identical to today. Confirmed.

---

### 3. Memory and Disposal

Every GPU resource mounted is enumerated below. Each entry names the resource
type, the mount site, and the confirmed or risk-qualified disposal path.

#### 3.1 Body geometry, material, and DataTexture (BodyMesh)

**Resources created:** one indexed `BufferGeometry` (via `buildBodyGeometry`),
one non-indexed `BufferGeometry` clone (via `toNonIndexed`), one barycentric
`BufferAttribute`, one `ShaderMaterial` (body wireframe), one 64x64
`DataTexture` (cellTexture).

**Mount site:** `FormaVisionCanvas.tsx:158-163` (`mounted` useMemo keyed on
`buildOptions`). The mount calls `mountBodyGeometry` which owns all five
resources.

**Disposal:** `mountBodyGeometry.ts:92-98` defines a `dispose()` that calls:
1. `nonIndexed.dispose()` (line 95)
2. `built.dispose()` (line 96, the indexed source via the builder's own cleanup)
3. `materialHandle.dispose()` (line 97, which includes the DataTexture)

This `dispose()` is called at `FormaVisionCanvas.tsx:411-415`:
```ts
useEffect(() => {
  return () => {
    mounted.dispose();
  };
}, [mounted]);
```

The dependency is `mounted`, not `[]`, so the cleanup fires on BOTH unmount AND
on a topology change (tier step from cinematic to lite, which changes
`buildOptions` and remounts). No resource from the previous tier outlives the
remount. Confirmed: 4 disposal points (indexed geom, non-indexed geom, material,
DataTexture).

#### 3.2 Ghost mesh (GhostMesh)

**Resources created:** same set as BodyMesh (via `mountGhostBody` which delegates
to `mountBodyGeometry`): one indexed + one non-indexed BufferGeometry, one
ShaderMaterial, one DataTexture.

**Mount site:** `GhostMesh.tsx:82`: `mountedRef.current = mountGhostBody(...)`.

**Disposal:** two separate effects provide coverage.

Build-effect (`GhostMesh.tsx:66-91`, keyed on `[active, ghostVector, buildOptions]`):
```ts
const hadGhost = mountedRef.current !== null;
if (mountedRef.current) {
  mountedRef.current.dispose();
  mountedRef.current = null;
}
```
This fires at the TOP of each effect run before a new ghost is built, covering
show-to-hide, show-to-update, and hide-to-show transitions. Confirmed.

Unmount-effect (`GhostMesh.tsx:96-101`, keyed on `[]`):
```ts
return () => {
  mountedRef.current?.dispose();
  mountedRef.current = null;
};
```
Covers Canvas teardown or section unmount while the ghost is visible. Confirmed.

Total: 2 confirmed disposal paths for the ghost body resources.

#### 3.3 MeasurementRing (TubeGeometry and MeshBasicMaterial)

**Resources created:** one `TubeGeometry` (`MeasurementRing.tsx:80`) and one
`MeshBasicMaterial` (line 147) per selected region.

**Disposal path A (region change):** At the top of the `useEffect` keyed on
`[loop]` (`MeasurementRing.tsx:127-211`), lines 128-135 explicitly call:
```ts
geometryRef.current.dispose();
materialRef.current.dispose();
```
before building a new ring. This fires when the user selects a different region
or when the body morphs (which recomputes `paramVector`, which recomputes `loop`).
Confirmed for this path.

**Disposal path B (deselect / unmount):** The effect cleanup (`MeasurementRing.tsx:203-208`)
calls `controller.deselect()` and then sets `geometryRef.current = null` and
`materialRef.current = null`. It does NOT call `.dispose()` directly. After
this cleanup, the geometry and material refs are null, so path A's top-of-effect
guard will not fire on the next run.

**LEAK RISK (CONDITIONAL): MeasurementRing unmount/deselect path.**
Whether the TubeGeometry and MeshBasicMaterial are actually freed on the
deselect/unmount path depends on whether `createMeasurementRingController`'s
`deselect()` implementation calls the `dispose` callback (`MeasurementRing.tsx:188-191`).
If `deselect()` cancels the animation without calling `dispose`, the geometry and
material are orphaned on the GPU. This path is not visible in the files read for
this analysis; verification requires reading `createMeasurementRingController` in
the motion module. This is flagged as a conditional leak risk on the tab-switch
and section-toggle paths.

#### 3.4 EmphasisParticles (BufferGeometry and PointsMaterial)

**Resources created:** one `BufferGeometry` (`EmphasisParticles.tsx:62`) and one
`PointsMaterial` (line 121) per emphasis region burst.

**Disposal path A (region change):** Top of the `useEffect` keyed on `[loop]`
(`EmphasisParticles.tsx:103-166`), lines 105-112 explicitly dispose previous
geometry and material before building a new burst. Confirmed for this path.

**LEAK RISK (CONDITIONAL): EmphasisParticles cancel path.**
The effect cleanup (`EmphasisParticles.tsx:159-163`) calls `controller.cancel()`
and sets refs to null without directly calling `.dispose()`. The `dispose`
callback is given to the controller at lines 148-151. Whether `cancel()` calls
this dispose (mid-flight cancel of the burst animation) is not confirmed without
reading `createEmphasisParticleController` in the motion module. If cancel does
not call dispose, the 14-point geometry and PointsMaterial are orphaned. Flagged
as conditional leak risk.

#### 3.5 MeasurementCallouts (leader line geometries and LineBasicMaterial)

**Resources created:** one `LineBasicMaterial` (shared, `MeasurementCallouts.tsx:115`)
and N `BufferGeometry` objects, one per callout (`MeasurementCallouts.tsx:121-132`),
where N is the callout anchor count.

**Disposal:** the effect cleanup (`MeasurementCallouts.tsx:155-164`) explicitly
disposes all resources without delegating to a controller:
```ts
controller.cancel();
for (const g of lineGeometriesRef.current) {
  g.dispose();
}
lineGeometriesRef.current = [];
if (lineMaterialRef.current) {
  lineMaterialRef.current.dispose();
  lineMaterialRef.current = null;
}
```
This fires on: tab-switch away from measurements (active becomes false), body
morph while on measurements tab (anchors recomputes), and unmount. Confirmed:
the cleanup owns and directly disposes every resource without trusting a
controller. This is the cleanest disposal pattern in the codebase.

Also confirmed: the top-of-effect guard (`MeasurementCallouts.tsx:98-107`)
disposes any residue before each rebuild, providing double coverage.

**LEAK RISK (CONFIRMED): MeasurementCallouts anchor dot geometry and material.**
Each callout anchor renders an inline JSX dot sphere (`MeasurementCallouts.tsx:195-198`):
```tsx
<mesh position={[anchor.x, anchor.y, anchor.z]} scale={0.6 + 0.4 * p}>
  <sphereGeometry args={[0.018, 8, 8]} />
  <meshBasicMaterial color={FORMA_VISION_HEX.teal} transparent opacity={p} toneMapped={false} />
</mesh>
```
The `<sphereGeometry>` and `<meshBasicMaterial>` JSX elements create `SphereGeometry`
and `MeshBasicMaterial` instances managed by r3f's reconciler. When the component
renders `null` (tab-switch away from measurements, or animation not yet progressed),
r3f removes these nodes from the scene but does NOT reliably call `.dispose()` on
the underlying Three.js objects. This is a well-known r3f behavior: implicit
disposal via reconciler removal is not guaranteed for JSX-declared geometry and
material. For N callout anchors visible before a tab-switch (N is the count of
measured circumference sites), N `SphereGeometry` and N `MeshBasicMaterial`
instances can be orphaned on the GPU. This is a confirmed leak risk on every
measurements-to-other-tab transition. The fix is to promote these inline JSX
resources to explicit refs with disposal in the existing cleanup closure, or to
use r3f's `dispose` prop.

#### 3.6 ContactShadows (drei-managed FBO)

`ContactShadows` (`FormaVisionCanvas.tsx:728-735`) creates internal render targets
(framebuffer objects) via drei. Drei's implementation manages its own disposal on
unmount via its `useEffect` cleanup. No user-side disposal is needed or present.
This is correct. The device verification checklist includes a step to confirm the
FBO is freed on section unmount (no WebGL memory growth across multiple toggles).

#### 3.7 Disposal summary

| Resource | Mount site (file:line) | Disposal confirmed | Risk |
|---|---|---|---|
| Body indexed BufferGeometry | mountBodyGeometry.ts:73 | Yes: mountBodyGeometry.ts:96 | None |
| Body non-indexed BufferGeometry | mountBodyGeometry.ts:78 | Yes: mountBodyGeometry.ts:95 | None |
| Body ShaderMaterial | mountBodyGeometry.ts:88 | Yes: mountBodyGeometry.ts:97 | None |
| Body DataTexture (cellTexture) | cellTexture.ts:61 | Yes: materialHandle.dispose() chain | None |
| Ghost body resources (x4) | ghostBody.ts:55 | Yes: GhostMesh.tsx:69 + 98 | None |
| TubeGeometry (ring) | MeasurementRing.tsx:80 | Partial: region-change path yes; unmount path conditional | CONDITIONAL |
| MeshBasicMaterial (ring) | MeasurementRing.tsx:147 | Partial: region-change path yes; unmount path conditional | CONDITIONAL |
| BufferGeometry (particles) | EmphasisParticles.tsx:62 | Partial: region-change path yes; cancel path conditional | CONDITIONAL |
| PointsMaterial (particles) | EmphasisParticles.tsx:121 | Partial: region-change path yes; cancel path conditional | CONDITIONAL |
| Leader line BufferGeometry x N | MeasurementCallouts.tsx:121 | Yes: explicit loop in cleanup (lines 156-159) | None |
| LineBasicMaterial (callouts) | MeasurementCallouts.tsx:115 | Yes: explicit in cleanup (lines 160-163) | None |
| Anchor dot SphereGeometry x N | MeasurementCallouts.tsx:196 | No: JSX-inline, r3f implicit only | CONFIRMED LEAK |
| Anchor dot MeshBasicMaterial x N | MeasurementCallouts.tsx:197 | No: JSX-inline, r3f implicit only | CONFIRMED LEAK |

Confirmed disposal points (explicit `.dispose()` call in user code): 11
Conditional disposal points (depend on controller internals not fully traced): 4
Confirmed leak risk points (JSX-inline geometry/material): 2 (N instances each)

---

### 4. Fallback Ladder

**Ladder definition:** `tierLadder.ts:10-18`:
```ts
const NEXT_DOWN: Record<RenderTier, RenderTier> = {
  cinematic: 'lite',
  lite: '2d',
  '2d': '2d',
};
```
`stepTierDown` is pure and idempotent at the floor. Repeated `reportBudgetMiss`
calls cannot advance past `'2d'`. Confirmed.

**Step-down is sticky (no auto step-up):** `RenderTierProvider.tsx:60-62` uses
`setTier((current) => stepTierDown(current))`. React state persists for the
session; there is no timer or condition that restores a higher tier.
Confirmed no flip-flopping.

**`'2d'` tier converges on the existing WebGL fallback floor:**
`BodyCompositionAvatar.tsx:100-108`: when `tier === '2d'`, `setFellBack(true)`
fires and the component renders `children` (the 2D SegmentalHeatMap). This is
the SAME `fellBack` branch the WebGL-unavailable gate
(`FormaVision3DAvatar.tsx:133-143`) and the `AvatarErrorBoundary` render error
use. There is exactly one 2D render branch; no parallel path is introduced.
Confirmed.

**Capability probe initial tier:** `capabilityProbe.ts:37-72` (`decideInitialTier`)
applies conservative rules: a software renderer string (SwiftShader, llvmpipe,
Microsoft Basic) alone yields `'lite'`; 2 GiB or less device memory alone yields
`'lite'`; a coarse-pointer (touch) device paired with 4 GiB or fewer memory OR
4 or fewer cores yields `'lite'`. Any unknown signal defaults to `'cinematic'`.
The probe never returns `'2d'`; that tier is reached only by runtime step-down
or the existing WebGL-unavailable/error paths. Confirmed.

**Probe context-release fix (M1 / low-end device guard):**
`capabilityProbe.ts:108-113` releases the throwaway probe WebGL context via
`WEBGL_lose_context.loseContext()` in a `finally` block so the probe cannot
exhaust the live-context cap (typically 8-16 on low-end devices) before the
real avatar canvas mounts. Confirmed.

**Degradation is clean; no crash path identified.** The ladder step invokes only
`setTier` (a React state setter, always safe). The `'2d'` floor renders the
children prop that was already being rendered before 3D was added.
Confirmed: degrades gracefully at every rung, never crashes.

---

## On-Device Verification Checklist

Items below are NOT verifiable by static analysis. Each requires Gary to run on
real hardware and observe the named behavior.

### Frame loop correctness

- [ ] **Demand loop stays quiet at idle.** Mount the avatar on cinematic on a
  capable desktop browser. Open the browser's GPU frame timeline (Chrome DevTools
  > Performance > GPU lane, or WebGL Inspector). After the materialize intro
  completes and OrbitControls damping settles, confirm zero frames are produced
  with no user interaction. Expected: the GPU lane shows silence.

- [ ] **`useFrame` priority-0 with `FrameBudgetMonitor` mounted does NOT promote
  continuous rendering.** Enable the monitor by passing `onBudgetMissed` (which
  is wired in the default composition page path). Verify in the GPU frame
  timeline that frame rate at idle is still zero, not continuous. This validates
  the "never calls invalidate" contract at runtime.

- [ ] **OrbitControls damping settles and stops.** Drag to orbit and release.
  Confirm frames continue briefly (inertia) then stop. No continuous drip.

### Tier step-down ladder

- [ ] **Capable device (desktop, M-series Mac, high-end phone) never false-steps
  during a heavy morph or orbit.** Load avatar on cinematic, trigger rapid morph
  via the scrub timeline, orbit simultaneously, confirm the tier stays cinematic
  throughout and `onBudgetMissed` is never called. This validates the 34 ms
  budget and 20-frame window do not over-trigger on a capable GPU.

- [ ] **Genuine low-power phone steps down correctly.** On a mid-range Android
  phone (Snapdragon 6-series or equivalent), load the avatar at cinematic (by
  temporarily bypassing the probe). Confirm the frame-budget monitor fires and
  the tier steps to lite within a morph sequence. Then trigger another heavy
  morph sequence at lite and confirm the monitor either stays at lite (if lite is
  fast enough) or steps to 2d (producing the SegmentalHeatMap floor). Validate
  that the fallback to 2d renders correctly with the composition data populated.

- [ ] **Capability probe correctly classifies the test device.** On the same low-
  power phone, load without bypassing the probe. Confirm the initial tier is
  `'lite'` (log `probeRenderTier()` result or expose via dev mode overlay).

### Memory stability

- [ ] **No memory growth across repeated tab switches.** Open the avatar on the
  measurements tab (callouts visible). Use Chrome DevTools Memory > Timeline to
  record a heap snapshot. Switch to bodyFat, switch back to measurements, repeat
  10 times. Take a final snapshot. Confirm GPU memory is stable (no growth) and
  the JS heap does not show retained Three.js geometry or material objects in
  the snapshot comparison. This validates the disposal chain for leader-line
  geometries and materials, and exposes any anchor-dot JSX leak.

- [ ] **Anchor dot leak validation (targeted).** On the measurements tab, note
  the count of callout anchor spheres rendered (one per measured circumference
  site). Switch to bodyFat, then back to measurements five times. In DevTools
  Memory, search for `SphereGeometry` and `MeshBasicMaterial` retained instances.
  Confirm the count does not grow across cycles. If it grows, each cycle leaks
  N `SphereGeometry` and N `MeshBasicMaterial` objects (the confirmed leak risk
  in section 3.5 above).

- [ ] **No memory growth across repeated section toggles (3D vs 2D).** On a
  mid-range device that step-downs to 2d, toggle the composition section
  off/on multiple times. Confirm no GPU heap growth and no JavaScript
  heap growth from retained Three.js objects.

- [ ] **Ghost mesh frees on hide.** Toggle `showGhost` on and off ten times.
  Confirm no retained `MountedBody` geometry or material in a heap snapshot.

- [ ] **ContactShadows FBO freed on section unmount.** Unmount the avatar section
  (navigate away). In the GPU memory profiler, confirm the 256x256 shadow render
  target does not appear in retained GPU objects.

- [ ] **MeasurementRing disposal on deselect.** Select a body region (ring
  appears). Deselect. Take a heap snapshot and confirm no retained `TubeGeometry`
  or `MeshBasicMaterial` from the ring. This validates the conditional risk in
  section 3.3 (whether `controller.deselect()` calls its dispose callback).

### Interaction quality

- [ ] **Smooth orbit, morph, and scrub on a mid-range phone.** On a Snapdragon
  6-series or MediaTek Dimensity 7-series device at the appropriate tier (lite),
  verify: (1) orbit drag responds without jank; (2) scrub timeline controls the
  body shape smoothly; (3) region selection eases the camera without stutter.
  Acceptable: occasional single-frame stutter during the morph; unacceptable:
  sustained jank or dropped frames that would trigger a step-down at lite.

- [ ] **VisibilityPump re-paints correctly on tab return.** Switch browser tabs
  away, then return. Confirm the avatar repaints once (one demand frame from
  the `visibilitychange` handler) and does not start continuous rendering.

### Frame-budget monitor threshold tuning

The following items target known first-pass threshold risks to validate or tune
before shipping:

- [ ] **Sub-4 fps device (greater than 250 ms per frame) is caught by the
  capability probe, not the monitor.** A device so slow that every inter-frame
  delta exceeds `idleGapMs` (250 ms) has its deltas discarded as idle gaps, so
  the frame-budget monitor can never fire on it. On any such device found in
  testing, confirm the capability probe correctly classified it as `'lite'` at
  startup (renderer string or memory signal). If the probe missed it, add its
  renderer string to `LOW_POWER_RENDERER_HINTS` or tighten the memory threshold.

- [ ] **Short morph (fewer than 20 rendered frames) does not trip a step-down
  alone.** On a capable device, trigger the fastest possible morph (minimal data
  change, reduced-motion snap). Confirm no step-down fires. This validates that
  `windowSize = 20` correctly gates out brief transitions that only produce a
  few rendered frames.

- [ ] **Sustained 30-to-60 fps range on lite does not step down to 2d.** On the
  target mid-range device running at lite tier, confirm that normal use (orbit,
  region selection, measurement ring draw) does not accumulate 20 consecutive
  over-budget frames. If it does, `budgetMs = 34` may be too tight for the lite
  geometry and should be loosened to 50 ms (20 fps floor) for the lite tier,
  using the `budgetMs` option on `createFrameBudgetSampler`.

'use client';

// The react-three-fiber scene for the FormaVision 3D avatar (Prompt 210b, P1-T4;
// Brief 58 Phase 1 ZOZO-class plasma-teal mesh bar).
//
// This module is dynamically imported (ssr:false) by FormaVision3DAvatar, so the
// whole three bundle stays out of the SSR and first-paint path. It composes the
// mounted body geometry plus wireframe glow material into a demand-driven Canvas:
// nothing renders until an interaction, a remount, or a visibility change asks for
// a frame. A constrained OrbitControls allows turntable azimuth with a clamped
// polar range and no panning. Default hero is rear ¾ A-pose, cropped at the
// ankles. Soft contact-shadow + a teal plate disc ground the body; rim lives in
// the shader (no @react-three/postprocessing bloom).
//
// Lifecycle contract honored here: dispose the mounted body on unmount, pause
// rendering when the canvas leaves the viewport (IntersectionObserver) or the tab
// is hidden (visibilitychange), and never run an idle turntable when reducedMotion
// is set (no auto-spin is started anywhere; motion choreography is Phase 2).

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Mesh, Spherical, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { sampleBodyPositions } from '@/lib/formavision/geometry/sampleBodyPositions';
import { BODY_BUILD_BY_TIER } from '@/lib/formavision/geometry/buildBodyGeometry';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  createMaterializeIntro,
  createMorphController,
  resolveMorphFromVector,
  createCameraFramingController,
  createIdleTurntable,
  createHighlightController,
  createOverlayController,
  createScrubController,
  shouldHoldScrubMorph,
  bodyVectorHasFiniteGirth,
  useDemandScheduler,
  FULL_BODY_FRAMING,
  ORBIT_DISTANCE_MIN,
  ORBIT_DISTANCE_MAX,
  AVATAR_VERTICAL_FOV_DEG,
  fullBodyCameraPosition,
  type CameraFraming,
  type IdleTurntable,
  type MaterializeIntro,
} from '@/lib/formavision/motion';
import { ringLoopForRegion } from '@/lib/formavision/geometry/ringLoopForRegion';
import { createFormaVisionRenderer } from '@/lib/formavision/gl/createFormaVisionRenderer';
import {
  attachWebGLContextRecovery,
  canvasHasZeroClientBox,
  drawingBufferHasPixels,
  scheduleFirstPaintWatchdog,
  scheduleZeroSizeHonestyCheck,
  shouldFireFirstInteractive,
  shouldStampPaintedFrame,
  shouldTreatGlCreatedAsPainted,
  syncCanvasToParentBox,
} from '@/lib/formavision/gl/webglContextRecovery';
import { isSafariWebGLHost } from '@/lib/formavision/gl/acquireWebGLContext';
import { createFrameBudgetSampler } from '@/lib/formavision/tier/frameBudgetMonitor';
import { dprForTier, showParticlesForTier } from '@/lib/formavision/tier/tierCost';
import {
  segmentTintArray,
  shouldShowOverlay,
  type SegmentTintRecord,
} from '@/lib/formavision/geometry/segmentTints';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex, BodyParamVector } from '@/lib/formavision/geometry/types';
import {
  applyAvatarMorphStamp,
  buildAvatarMorphStamp,
  type AvatarGirthSource,
} from '@/lib/formavision/morph/avatarMorphStamp';
import { mountBodyGeometry } from './mountBodyGeometry';
import { MeasurementRing } from './MeasurementRing';
import { EmphasisParticles } from './EmphasisParticles';
import { MeasurementCallouts } from './MeasurementCallouts';
import { GhostMesh } from './GhostMesh';
import { AbWipeMesh } from './AbWipeMesh';
import {
  clampWipeT,
  shouldRenderAbWipe,
  wipeModeForRole,
} from '@/lib/formavision/compare/abWipe';
import { FORMAVISION_MOTION_SPEC } from '@/lib/formavision/motion/floorMotionSpec';
import { selectPlateMeshSource } from '@/lib/formavision/meshy/selectPlateMeshSource';
import type { MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import { MeshyGlbMesh } from './MeshyGlbMesh';
import { MeshyGlbBoundary } from './MeshyGlbBoundary';

export interface FormaVisionCanvasProps {
  sex: Sex;
  scan: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  // The unit the circumference values are expressed in. Forwarded into the param
  // mapper verbatim; never assumed. See the UNIT CONTRACT in FormaVision3DAvatar.
  unit: MeasurementUnit;
  heightCm?: number | null;
  reducedMotion?: boolean;
  // The currently selected body region (a ring id such as 'chest' or 'rThigh'), or
  // null for the full-body view. Drives the eased camera framing and the selected
  // region highlight. The picker that sets this is a later task; here the avatar only
  // responds to it.
  selectedBodyPart?: string | null;
  // Optional region that gets a one-shot orange emphasis particle accent (a peak
  // change or win). A later task feeds this from the composition delta; unset means
  // no particles fire.
  emphasisRegion?: string;
  // The active composition tab. The per-segment overlay tint is shown only on the
  // bodyFat and muscleMass tabs; measurements shows no tint.
  activeTab?: 'bodyFat' | 'muscleMass' | 'measurements';
  // Optional per-segment status colors (green/yellow/red) keyed by segment name, or
  // null where UNKNOWN. A later task (OV-T2/T3) computes these from the heatmap
  // helpers; unset or null means no overlay tint and the avatar looks as today.
  segmentTints?: SegmentTintRecord | null;
  // Optional scrub shape. When set the body follows it DIRECTLY (no tween) on every
  // change, the foundation for the timeline scrubber (P3-T2b drives it). Null resumes
  // normal target-morph from the last scrubbed shape.
  scrubVector?: BodyParamVector | null;
  // Optional projected future-self shape (from projectFutureSelfVector, P5-T1a). When
  // showGhost is true AND this is non-null, a translucent ghost of the projected body
  // is overlaid on the current avatar via the sibling GhostMesh. Null/undefined or
  // showGhost false renders nothing (no fabrication). The toggle + goal resolution that
  // DRIVE these are the next task (P5-T1c); this is the render-side prop seam only.
  ghostVector?: BodyParamVector | null;
  // Master gate for the projected ghost. Defaults to off, so the avatar looks exactly
  // as today until P5-T1c wires the toggle.
  showGhost?: boolean;
  // Brief 2: screen-space A/B wipe against a baseline BodyParamVector. Off by
  // default (current body unchanged). wipeT is 0..1 from the left edge.
  wipeActive?: boolean;
  wipeT?: number;
  wipeVector?: BodyParamVector | null;
  // Lite tier trims geometry density for low-power devices; cinematic is full.
  renderTier?: 'cinematic' | 'lite';
  // P7-T1: called (at most once per sustained over-budget window) when the demand-loop
  // frame budget is missed, so the RenderTierProvider can step the tier down. When
  // absent the frame-budget monitor is not mounted and the scene is byte-identical to
  // before this phase.
  onBudgetMissed?: () => void;
  // P8-T1b: called once at the end of each user orbit gesture (OrbitControls onEnd).
  // Fire-and-forget telemetry seam for formavision.avatar_rotated. Absent means
  // no telemetry fires; the scene is byte-identical to before this phase.
  onOrbitEnd?: () => void;
  // P8-T1c: called once after the first PAINTED demand frame so the parent
  // can measure timeToFirstInteractiveMs. GL onCreated must NOT fire this
  // (context ready ≠ pixels). Absent means the metric is omitted.
  onFirstInteractive?: () => void;
  // Honest Ready/overlay/measured girth provenance for data-morph attrs.
  girthSource?: AvatarGirthSource;
  // Confirmed WebGL context loss after the canvas mounted. The parent waits
  // for restore (or remounts / latches). Absent means context-lost is ignored.
  onContextLost?: (error: unknown) => void;
  // Browser restored GL after preventDefault(webglcontextlost). Parent remounts
  // the Canvas so THREE can rebuild. Absent means restore is ignored.
  onContextRestored?: () => void;
  // Prompt 211a W1 (shareable clip): the r3f frameloop mode. The canvas is
  // "demand" by default (frames only on interaction / invalidate). The clip
  // recorder sets this to "always" for the duration of a recording so
  // canvas.captureStream() emits every painted morph frame, then restores it to
  // undefined (demand) when done. ADDITIVE + minimal: when absent the canvas is
  // byte-identical to before this prop (demand). No other behavior changes.
  frameloopMode?: 'always' | 'demand';
  // Stored-GLB swap-in. Absent keeps the parametric scan-morph mesh.
  meshyGlbUrl?: string | null;
  meshyStatus?: MeshyVisualStatus;
}

// Vertical / radial density per render tier. Cinematic is Brief 58 ZOZO-class
// (96×80). Lite stays cheaper than Phase 0 64×48 for the frame-budget step-down.
const TIER_BUILD = BODY_BUILD_BY_TIER;

// Mid-body orbit target. Must match FULL_BODY_FRAMING so the default view and
// the "clear selection" tween land on the same head-to-toe pose.
const TARGET_Y = FULL_BODY_FRAMING.targetY;

// The single mesh node. It builds and owns the mounted body, drives one demand
// frame whenever its inputs change, and disposes everything on unmount.
function BodyMesh(
  props: FormaVisionCanvasProps & {
    // Set by this mesh so the Canvas pointer handler can skip the intro to its
    // final lit state on the first interaction. Null between mounts.
    introRef: React.MutableRefObject<MaterializeIntro | null>;
    // The idle turntable, suspended by this mesh while the intro or a morph runs so
    // the camera does not spin during a shape transition.
    turntableRef: React.MutableRefObject<IdleTurntable | null>;
  },
) {
  const meshRef = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const scheduler = useDemandScheduler();

  const buildOptions = useMemo(
    () => TIER_BUILD[props.renderTier ?? 'cinematic'],
    [props.renderTier],
  );

  // The current target param vector is a pure function of every shape input. A
  // change here is a morph target, not a remount: topology is invariant across
  // param vectors (lerpParamVector preserves ring ids and counts), so the body
  // tweens its position attribute to this shape rather than rebuilding.
  const paramVector = useMemo(
    () =>
      scanToParamVector({
        snapshot: props.scan,
        circumferences: props.circumferences,
        sex: props.sex,
        heightCm: props.heightCm,
        unit: props.unit,
      }),
    [props.scan, props.circumferences, props.sex, props.heightCm, props.unit],
  );

  const morphedBodyRef = useRef<ReturnType<typeof mountBodyGeometry> | null>(null);
  // True while a scrub is active: the morph stays suspended so it never fights the
  // direct-set scrub. lastScrubVectorRef holds the shape the body was left at when a
  // scrub ended, so the next target-morph baselines from there with no jump.
  const scrubActiveRef = useRef(false);
  const lastScrubVectorRef = useRef<BodyParamVector | null>(null);
  // Shape currently on the mesh. Mount is keyed only on topology, so the first
  // paint may be the sex template; later overlay/history girths must tween FROM
  // that displayed vector, not from the incoming target (from===to is a no-op
  // silhouette if the controller thinks it is already at the new shape).
  const displayedVectorRef = useRef<BodyParamVector | null>(null);
  const mountedFromRef = useRef<BodyParamVector>(paramVector);

  // Topology-affecting inputs plus girth presence. First Canvas paint often
  // happens before Ready/history circs arrive (sex template). Keying only on
  // buildOptions left that template mesh in place; morphTo could be skipped or
  // cancelled on the demand loop, so estimate girths never drove the silhouette.
  // Flipping template→girth remounts at the live param vector (Ready BF estimate).
  const hasGirth = bodyVectorHasFiniteGirth(paramVector);
  const mounted = useMemo(() => {
    mountedFromRef.current = paramVector;
    displayedVectorRef.current = paramVector;
    return mountBodyGeometry(paramVector, { build: buildOptions });
    // Remount when topology changes OR when real girths first arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildOptions, hasGirth]);

  // Request a frame whenever a fresh body is mounted (demand loop is otherwise idle).
  useEffect(() => {
    invalidate();
  }, [mounted, invalidate]);

  // Arnold smoke reads data-morph-* on the real WebGL canvas. Missing attrs
  // are INCONCLUSIVE → lean FAIL even when estimate girths are applied.
  useEffect(() => {
    const stamp = buildAvatarMorphStamp({
      scan: props.scan,
      circumferences: props.circumferences,
      sex: props.sex,
      unit: props.unit,
      source: props.girthSource,
    });
    applyAvatarMorphStamp(gl.domElement, stamp);
  }, [
    props.scan,
    props.circumferences,
    props.sex,
    props.unit,
    props.girthSource,
    paramVector,
    gl,
  ]);

  // Live morph: when the target param vector changes (and the body is past its first
  // mount), tween the persistent geometry to the new shape by lerping its position
  // attribute. This REPLACES a remount-and-snap on data change, so the materialize
  // intro (first-mount only, keyed on mounted) never re-fires on a morph. Reduced
  // motion snaps with no tween. The morph never rebuilds the geometry per frame: it
  // samples the from and to positions once, then lerps into the live buffer.
  //
  // morphedBodyRef tracks the body the last morph effect ran against. A change of
  // mounted is a remount (topology changed): that body is freshly built at the
  // current param vector and the intro owns its first paint, so no morph fires. A
  // paramVector change against the same mounted is a real morph target.
  // The live morph controller, held so the scrub effect can cancel an in-flight tween
  // the instant a scrub begins (a coincident data + scrub change must not leave a tween
  // running underneath the direct-set scrub).
  const morphControllerRef = useRef<ReturnType<typeof createMorphController> | null>(null);
  useEffect(() => {
    const geometry = mounted.geometry;
    const positionAttr = geometry.getAttribute('position');
    // Baseline the morph at the last scrubbed shape when one exists, so resuming the
    // tween after a scrub starts from the body on screen rather than a stale target.
    const baseline = resolveMorphFromVector(
      lastScrubVectorRef.current,
      displayedVectorRef.current ?? mountedFromRef.current,
      paramVector,
    );
    const controller = createMorphController(
      {
        samplePositions: (vec) => sampleBodyPositions(vec, buildOptions),
        writePositions: (positions) => {
          (positionAttr.array as Float32Array).set(positions);
          positionAttr.needsUpdate = true;
          invalidate();
        },
        recomputeNormals: () => {
          geometry.computeVertexNormals();
          // Settle hook: recomputeNormals fires once when a morph lands (and on the
          // reduced-motion snap), so release the turntable suspend here.
          props.turntableRef.current?.setSuspended(false);
        },
        scheduler,
        reducedMotion: props.reducedMotion,
      },
      baseline,
    );
    morphControllerRef.current = controller;

    // A fresh mount is already built at this param vector, so the first pass for a
    // given body is a no-op (the intro owns first paint). A scrub is in control while
    // active, so no morph fires then. The scrub gate reads props.scrubVector directly
    // (not just scrubActiveRef) so a coincident data + scrub change in the SAME render,
    // where the scrub effect has not yet set the ref, still suppresses the tween: scrub
    // wins, and the data change is honored on the next non-scrub morph from the last
    // scrub shape. Otherwise a param-vector change morphs (from the last scrub shape
    // when one exists), and the consumed scrub baseline is cleared.
    const scrubbing = shouldHoldScrubMorph(props.scrubVector, props.circumferences);
    // First pass on a remount that already includes girths is a no-op tween
    // (geometry was built at paramVector). Still morph when the same mount
    // later receives a new vector. Always stamp the live canvas.
    if (morphedBodyRef.current === mounted && !scrubbing) {
      // Pause the idle turntable for the duration of the morph so the camera does
      // not spin while the body changes shape; recomputeNormals releases it.
      props.turntableRef.current?.setSuspended(true);
      controller.morphTo(paramVector);
      displayedVectorRef.current = paramVector;
      lastScrubVectorRef.current = null;
    } else {
      if (displayedVectorRef.current == null) {
        displayedVectorRef.current = mountedFromRef.current;
      }
    }
    morphedBodyRef.current = mounted;

    return () => {
      controller.cancel();
      if (morphControllerRef.current === controller) {
        morphControllerRef.current = null;
      }
    };
    // reducedMotion is read at morph time; buildOptions and scheduler are stable.
    // scrubVector is a dep so rest/play-end (null) can resume circumferences morph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, paramVector, props.scrubVector, props.circumferences, invalidate]);

  // Scrub controller lifecycle: build ONE stable scrub controller per mounted body,
  // held in a ref so scrubTo runs on the same instance across every scrubVector change.
  // Building it per change (as a scrubVector-keyed effect would) defeats the throttle:
  // the per-change cleanup would end() synchronously every tick, recomputing normals
  // per tick. With a stable instance the 90ms debounce actually spans ticks, so a
  // continuous drag recomputes normals at most once per quiet window. Disposed (its
  // pending recompute cancelled) on remount and unmount; no leak.
  const scrubControllerRef = useRef<ReturnType<typeof createScrubController> | null>(null);
  useEffect(() => {
    const geometry = mounted.geometry;
    const positionAttr = geometry.getAttribute('position');
    const controller = createScrubController({
      samplePositions: (vec) => sampleBodyPositions(vec, buildOptions),
      writePositions: (positions) => {
        (positionAttr.array as Float32Array).set(positions);
        positionAttr.needsUpdate = true;
        invalidate();
      },
      recomputeNormals: () => {
        geometry.computeVertexNormals();
        invalidate();
      },
      timer: {
        set: (cb, ms) => window.setTimeout(cb, ms),
        clear: (handle) => window.clearTimeout(handle),
      },
    });
    scrubControllerRef.current = controller;
    return () => {
      controller.cancel();
      if (scrubControllerRef.current === controller) {
        scrubControllerRef.current = null;
      }
    };
    // buildOptions and invalidate are stable; rebuilt only on a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, invalidate]);

  // Scrub drive: on each scrubVector change write the shape DIRECTLY (no tween) via the
  // STABLE controller. While scrubbing the morph is suspended (scrubActiveRef) and any
  // in-flight tween is cancelled the instant the scrub begins, so a coincident data +
  // scrub change never leaves a tween fighting the direct-set. The idle turntable is
  // paused and the materialize intro never fires (it is keyed on mounted, not on the
  // scrub). Normals recompute on the controller's trailing debounce. When scrubVector
  // clears, end() settles the rim once at the final shape and the body stays there; the
  // morph baselines from lastScrubVectorRef so the next target change does not jump.
  useEffect(() => {
    const scrubVector = props.scrubVector ?? null;
    const controller = scrubControllerRef.current;
    if (!controller) {
      return;
    }

    if (!scrubVector || !shouldHoldScrubMorph(scrubVector, props.circumferences)) {
      if (scrubActiveRef.current) {
        // Scrub just ended (or a null-girth latch was ignored): settle the rim.
        controller.end();
        scrubActiveRef.current = false;
      }
      return;
    }

    // Entering or continuing a scrub: cancel a live tween so it cannot fight the scrub.
    if (!scrubActiveRef.current) {
      morphControllerRef.current?.cancel();
      props.turntableRef.current?.notifyInteraction();
      scrubActiveRef.current = true;
    }
    controller.scrubTo(scrubVector);
    lastScrubVectorRef.current = scrubVector;
    displayedVectorRef.current = scrubVector;
    // buildOptions, scheduler and invalidate are stable; positions are direct-set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.scrubVector, props.circumferences]);

  // Selected-region highlight: gently brighten the wireframe around the selected
  // region's level via the material highlight uniform. The level comes from the SAME
  // ringLoopForRegion mapping the ring and camera use, so highlight, ring and camera
  // agree. Clearing the selection resets the uniform. Reduced motion applies it
  // statically. Cheap (a uniform update); pulses invalidate only while active.
  useEffect(() => {
    const controller = createHighlightController({
      setHighlight: (yN, intensity) => {
        mounted.materialHandle.setHighlight(yN, intensity);
        invalidate();
      },
      resolveLevel: (region) => ringLoopForRegion(paramVector, region).levelN,
      scheduler,
      reducedMotion: props.reducedMotion,
    });
    controller.highlightRegion(props.selectedBodyPart ?? null);
    return () => {
      controller.cancel();
    };
    // The highlight tracks the selection and the current body level; reducedMotion is
    // read at apply time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, paramVector, props.selectedBodyPart, scheduler, invalidate]);

  // Per-segment overlay tint: on the bodyFat or muscleMass tab WITH per-segment status
  // colors, set the material tints and cross-fade the overlay in; on measurements or
  // with no colors, fade it out (mix 0, avatar unchanged). The status colors are
  // computed elsewhere (OV-T2/T3) and passed via segmentTints; a null segment stays
  // neutral here (the material neutralizes it). Reduced motion sets the mix instantly.
  useEffect(() => {
    const controller = createOverlayController({
      setTints: (colors) => {
        // The material setter neutralizes any null entry to navy (UNKNOWN, no tint),
        // so positions are preserved and a missing segment never guesses a color.
        mounted.materialHandle.setSegmentTints(colors);
        invalidate();
      },
      setOverlayMix: (mix) => {
        mounted.materialHandle.setOverlayMix(mix);
        invalidate();
      },
      scheduler,
      reducedMotion: props.reducedMotion,
    });

    if (shouldShowOverlay(props.activeTab, props.segmentTints)) {
      controller.show(segmentTintArray(props.segmentTints));
    } else {
      controller.hide();
    }

    return () => {
      controller.cancel();
    };
    // reducedMotion is read at apply time; tints and tab drive the show/hide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, props.activeTab, props.segmentTints, scheduler, invalidate]);

  // Brief 2: screen-space wipe on the current body. Mode 0 when compare is off
  // so the shader path is byte-identical. Viewport width is drawing-buffer
  // pixels so retina gl_FragCoord.x matches the CSS wipe overlay.
  useEffect(() => {
    const enabled = shouldRenderAbWipe(props.wipeActive, props.wipeVector);
    const width = size.width * gl.getPixelRatio();
    mounted.materialHandle.setWipe(
      wipeModeForRole('current', enabled),
      clampWipeT(props.wipeT ?? 0.5),
      width,
    );
    invalidate();
  }, [
    mounted,
    props.wipeActive,
    props.wipeVector,
    props.wipeT,
    size.width,
    gl,
    invalidate,
  ]);

  // Play the materialize intro once per mounted body. Reduced motion lands the
  // body fully lit with no animation scheduled (full parity). The intro drives its
  // own demand invalidations while running, then stops; it does not fight the
  // VisibilityPump. Cancelled on remount or unmount so no frame writes a disposed
  // material.
  useEffect(() => {
    // Suspend the idle turntable while the intro plays so the camera holds still for
    // the materialize, then release it on completion (which begins the idle countdown).
    props.turntableRef.current?.setSuspended(true);
    const intro = createMaterializeIntro({
      target: mounted.materialHandle,
      scheduler,
      // Never prime uMorph=0. That hide-then-sweep left phone WebKit on an
      // invisible body while paint stayed pending (#187). First frame is the
      // lit holographic F3 grid (honest settle if already 3D).
      reducedMotion: true,
      onComplete: () => {
        invalidate();
        props.turntableRef.current?.setSuspended(false);
      },
    });
    props.introRef.current = intro;
    intro.start();
    return () => {
      intro.cancel();
      if (props.introRef.current === intro) {
        props.introRef.current = null;
      }
    };
    // The intro is keyed to the mounted body; reducedMotion is read at start time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, scheduler, invalidate]);

  // Dispose the mounted body (geometry, clone, material, texture) on unmount or
  // before the next mount replaces it. No leaks across remounts.
  useEffect(() => {
    return () => {
      mounted.dispose();
    };
  }, [mounted]);

  return (
    <mesh ref={meshRef} geometry={mounted.geometry} material={mounted.materialHandle.material} />
  );
}

// Read the camera's current framing (orbit target height and distance from target)
// off the live OrbitControls so a framing tween starts from the real pose.
function readControlsFraming(controls: OrbitControlsImpl): CameraFraming {
  const offset = new Vector3().subVectors(controls.object.position, controls.target);
  return { targetY: controls.target.y, distance: offset.length() };
}

// Apply a framing to the camera: move the orbit target's height and set the camera
// distance from the target while preserving the current azimuth and polar angle, so
// a framing move reads as a dolly-and-pan rather than a viewpoint jump.
function applyControlsFraming(controls: OrbitControlsImpl, framing: CameraFraming): void {
  const spherical = new Spherical().setFromVector3(
    new Vector3().subVectors(controls.object.position, controls.target),
  );
  spherical.radius = framing.distance;
  controls.target.y = framing.targetY;
  controls.object.position.copy(controls.target).add(new Vector3().setFromSpherical(spherical));
  controls.update();
}

// Rotate the camera around the orbit target by an azimuth delta (the idle turntable
// advance), keeping the polar angle and distance fixed.
function advanceControlsAzimuth(controls: OrbitControlsImpl, deltaRad: number): void {
  const spherical = new Spherical().setFromVector3(
    new Vector3().subVectors(controls.object.position, controls.target),
  );
  spherical.theta += deltaRad;
  controls.object.position.copy(controls.target).add(new Vector3().setFromSpherical(spherical));
  controls.update();
}

// Camera choreography: eased framing when a region is selected, plus the idle
// turntable. Composes with the intro and morph (both suspend the turntable via the
// shared ref) and with the inertial damping wired on OrbitControls onChange. Drives
// its own demand invalidations while active and stops when idle.
function CameraChoreography(props: {
  selectedBodyPart?: string | null;
  reducedMotion?: boolean;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  turntableRef: React.MutableRefObject<IdleTurntable | null>;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const scheduler = useDemandScheduler();

  // Build the framing controller and the idle turntable once; they read the live
  // controls each frame through the ref, so they survive control re-creation.
  const framingRef = useRef<ReturnType<typeof createCameraFramingController> | null>(null);
  useEffect(() => {
    const framing = createCameraFramingController({
      readFraming: () => {
        const controls = props.controlsRef.current;
        return controls ? readControlsFraming(controls) : FULL_BODY_FRAMING;
      },
      applyFraming: (f) => {
        const controls = props.controlsRef.current;
        if (controls) {
          applyControlsFraming(controls, f);
          invalidate();
        }
      },
      scheduler,
      reducedMotion: props.reducedMotion,
    });
    framingRef.current = framing;

    const turntable = createIdleTurntable({
      scheduler,
      timer: {
        set: (cb, ms) => window.setTimeout(cb, ms),
        clear: (handle) => window.clearTimeout(handle),
      },
      advanceAzimuth: (delta) => {
        const controls = props.controlsRef.current;
        if (controls) {
          advanceControlsAzimuth(controls, delta);
          invalidate();
        }
      },
      reducedMotion: props.reducedMotion,
    });
    props.turntableRef.current = turntable;
    turntable.begin();

    return () => {
      framing.cancel();
      turntable.dispose();
      framingRef.current = null;
      props.turntableRef.current = null;
    };
    // reducedMotion is read at construction; the controllers read controls live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduler, invalidate]);

  // React to a selection change: pause the turntable for the move, then ease the
  // camera to frame the region (or back to full body when cleared). The first run is
  // skipped when nothing is selected so a fresh mount does not nudge the camera with
  // a redundant full-body framing tween; the camera already starts at full body.
  const framedOnceRef = useRef(false);
  useEffect(() => {
    const region = props.selectedBodyPart ?? null;
    if (!framedOnceRef.current && region === null) {
      framedOnceRef.current = true;
      return;
    }
    framedOnceRef.current = true;
    props.turntableRef.current?.notifyInteraction();
    framingRef.current?.frameRegion(region);
  }, [props.selectedBodyPart, props.turntableRef]);

  return null;
}

// Bridges browser visibility and viewport intersection to the demand loop. When the
// tab is shown again or the canvas re-enters the viewport, request a frame so the
// avatar repaints; while hidden or offscreen no frames are requested at all.
function VisibilityPump({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    function onVisible(): void {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        invalidate();
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    const element = containerRef.current;
    let observer: IntersectionObserver | null = null;
    if (element && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              invalidate();
            }
          }
        },
        { threshold: 0.01 },
      );
      observer.observe(element);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (observer) {
        observer.disconnect();
      }
      // Canvas owns the WebGL renderer lifecycle and disposes the context on its
      // own unmount, so this pump must not touch gl: a disposal here would double
      // free the context, or kill a context the Canvas is still rendering into if
      // this effect re-runs while the Canvas persists.
    };
  }, [containerRef, invalidate]);

  return null;
}

// Runtime frame-budget monitor (P7-T1). Observes the duration between consecutive
// RENDERED frames and, on a sustained over-budget run, reports ONE budget-miss up to
// the RenderTierProvider so it can step the tier down.
//
// Demand-loop safe by construction: useFrame under frameloop="demand" runs only on
// frames the loop already produced, and this NEVER calls invalidate, so it adds no
// frames and starts no continuous loop. It only measures frames that were already
// going to render. The pure sampler discards idle gaps (a long pause between demand
// frames is not a slow frame) and applies hysteresis, so a capable device at
// cinematic never trips it. Mounted only when onBudgetMissed is provided.
function FrameBudgetMonitor({
  onBudgetMissed,
  renderTier,
}: {
  onBudgetMissed: () => void;
  renderTier: 'cinematic' | 'lite';
}) {
  const samplerRef = useRef<ReturnType<typeof createFrameBudgetSampler> | null>(null);
  if (samplerRef.current === null) {
    samplerRef.current = createFrameBudgetSampler();
  }
  const lastFrameTimeRef = useRef<number | null>(null);
  // One-shot per tier: a step-down remounts the body at the new density, so re-arm
  // and start a clean measurement window for the new tier rather than double-stepping
  // off a stale streak.
  const firedRef = useRef(false);
  useEffect(() => {
    samplerRef.current?.reset();
    lastFrameTimeRef.current = null;
    firedRef.current = false;
  }, [renderTier]);

  useFrame(() => {
    if (firedRef.current) {
      return;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    if (last === null) {
      // First rendered frame after mount or a tier change: no prior timestamp to diff.
      return;
    }
    const sampler = samplerRef.current;
    if (sampler && sampler.sample(now - last)) {
      firedRef.current = true;
      onBudgetMissed();
    }
  });

  return null;
}

function MeshSourceStamp({
  source,
  orbitUnlocked,
}: {
  source: 'parametric' | 'meshy-glb';
  orbitUnlocked: boolean;
}) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.domElement.setAttribute('data-mesh-source', source);
    gl.domElement.setAttribute(
      'data-appearance',
      source === 'meshy-glb' ? 'meshy-glb' : 'procedural',
    );
    gl.domElement.setAttribute(
      'data-mesh-look',
      source === 'meshy-glb' ? 'meshy-glb' : 'holographic-f3',
    );
    gl.domElement.setAttribute('data-orbit-unlocked', orbitUnlocked ? 'true' : 'false');
  }, [gl, source, orbitUnlocked]);
  return null;
}

// Observes the first demand frame that actually presents (non-zero canvas).
// onCreated / GL-ready must not claim this — phone WebKit can create a
// context and never paint. A timeout watchdog re-invalidates; it still
// does not fire onFirstInteractive unless a frame ran.
function FirstPaintWatchdog({
  onFirstPaint,
}: {
  onFirstPaint?: () => void;
}) {
  const firedRef = useRef(false);
  const paintedRef = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
    return scheduleFirstPaintWatchdog(
      () => paintedRef.current,
      () => {
        invalidate();
      },
    );
  }, [invalidate]);

  useFrame((state) => {
    if (firedRef.current) {
      return;
    }
    let clientBoxZero = canvasHasZeroClientBox(state.gl.domElement);
    let hasBuffer = drawingBufferHasPixels(state.gl);
    if (!shouldStampPaintedFrame({ clientBoxZero, drawingBufferHasPixels: hasBuffer })) {
      syncCanvasToParentBox(state.gl.domElement, state.gl);
      clientBoxZero = canvasHasZeroClientBox(state.gl.domElement);
      hasBuffer = drawingBufferHasPixels(state.gl);
      if (!shouldStampPaintedFrame({ clientBoxZero, drawingBufferHasPixels: hasBuffer })) {
        return;
      }
    }
    if (!shouldFireFirstInteractive('first-demand-frame')) {
      return;
    }
    firedRef.current = true;
    paintedRef.current = true;
    queueMicrotask(() => {
      onFirstPaint?.();
    });
  });

  return null;
}

export default function FormaVisionCanvas(props: FormaVisionCanvasProps) {
  const [glbLoadFailed, setGlbLoadFailed] = useState(false);
  const [glbReady, setGlbReady] = useState(false);
  const [orbitUnlocked, setOrbitUnlocked] = useState(false);
  const meshSource = selectPlateMeshSource({
    meshyGlbUrl: glbReady ? (props.meshyGlbUrl ?? null) : null,
    meshyStatus: props.meshyStatus ?? 'idle',
    glbLoadFailed,
  });
  const handleGlbReady = useCallback(() => {
    setGlbReady(true);
    setGlbLoadFailed(false);
  }, []);
  const handleGlbError = useCallback(() => {
    setGlbReady(false);
    setGlbLoadFailed(true);
  }, []);
  useEffect(() => {
    setGlbReady(false);
    setGlbLoadFailed(false);
  }, [props.meshyGlbUrl]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setOrbitUnlocked(true),
      FORMAVISION_MOTION_SPEC.settleMs,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  // Holds the running materialize intro so a pointer interaction can skip it to its
  // final lit state. BodyMesh owns the lifecycle; this is just the skip handle.
  const introRef = useRef<MaterializeIntro | null>(null);
  // The OrbitControls instance, read by the camera choreography to frame regions and
  // advance the idle turntable on the live camera.
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  // The idle turntable, shared so the intro and morph (in BodyMesh) can suspend it
  // and the interaction handlers below can pause it.
  const turntableRef = useRef<IdleTurntable | null>(null);

  // First pointer interaction completes the intro immediately. Harmless once the
  // intro has finished (skip is inert after completion).
  function skipIntro(): void {
    introRef.current?.skip();
    setOrbitUnlocked(true);
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full min-h-[200px] w-full"
      style={{ isolation: 'isolate', transform: 'translateZ(0)' }}
    >
      <Canvas
        // Demand loop: frames are produced only on interaction, mount, or an
        // explicit invalidate. No continuous render, no idle spin.
        // Prompt 211a W1: the clip recorder can flip this to "always" via
        // frameloopMode so captureStream() emits every morph frame during a
        // recording; absent / "demand" keeps the byte-identical demand loop.
        frameloop={props.frameloopMode ?? 'demand'}
        // P7-T2: dpr scaled by tier. Cinematic stays [1, 2] (byte-identical to
        // before this phase). Lite caps at [1, 1.5] to reduce fill-rate on
        // low-power GPUs. iPhone WebKit first-paint stays at 1×.
        dpr={dprForTier(props.renderTier ?? 'cinematic', isSafariWebGLHost())}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
        }}
        // Safari-safe factory: WebGL1 first on iPhone / Safari so a failed
        // webgl2 cannot poison this live canvas (Gary phone static-SVG path).
        // Chromium still prefers webgl2. Caveat-false + default powerPreference.
        gl={createFormaVisionRenderer}
        camera={{
          // Brief 58: rear ¾ A-pose, ankles cropped. Front +Z is out of the hero.
          position: fullBodyCameraPosition(),
          fov: AVATAR_VERTICAL_FOV_DEG,
          near: 0.1,
          far: 50,
        }}
        onPointerDown={skipIntro}
        // GL ready ≠ painted pixels. Do not fire onFirstInteractive here.
        onCreated={(state) => {
          // r3f spreads unknown DOM props onto the WRAPPER div, not the
          // <canvas>. Arnold / clip capture need the real WebGL canvas.
          state.gl.domElement.setAttribute('data-testid', 'formavision-avatar-canvas');
          state.gl.domElement.setAttribute('data-tier', props.renderTier ?? 'cinematic');
          state.gl.domElement.setAttribute(
            'data-appearance',
            meshSource === 'meshy-glb' ? 'meshy-glb' : 'procedural',
          );
          state.gl.domElement.setAttribute('data-result', 'scan-mesh');
          state.gl.domElement.setAttribute('data-mesh-source', meshSource);
          state.gl.domElement.setAttribute(
            'data-mesh-look',
            meshSource === 'meshy-glb' ? 'meshy-glb' : 'holographic-f3',
          );
          state.gl.domElement.setAttribute('data-surface', 'formavision3d');
          state.gl.domElement.setAttribute(
            'data-orbit-unlocked',
            orbitUnlocked ? 'true' : 'false',
          );
          applyAvatarMorphStamp(
            state.gl.domElement,
            buildAvatarMorphStamp({
              scan: props.scan,
              circumferences: props.circumferences,
              sex: props.sex,
              unit: props.unit,
              source: props.girthSource,
            }),
          );
          if (shouldTreatGlCreatedAsPainted()) {
            props.onFirstInteractive?.();
          }
          const canvasEl = state.gl.domElement;
          attachWebGLContextRecovery(canvasEl, {
            onLost: (error) => {
              props.onContextLost?.(error);
            },
            onRestored: () => {
              props.onContextRestored?.();
            },
          });
          scheduleZeroSizeHonestyCheck(canvasEl, (error) => {
            props.onContextLost?.(error);
          });
          syncCanvasToParentBox(canvasEl, state.gl);
          state.invalidate();
        }}
      >
        <color attach="background" args={[FORMA_VISION_HEX.navy]} />

        {/* Key + fill for the solid MeshStandardMaterial body. The old navy
            ambient + additive teal rig only lit the wireframe shard field. */}
        <ambientLight intensity={0.64} color="#f4efe6" />
        <directionalLight position={[1.8, 3.6, -2.2]} intensity={1.15} color="#ffffff" />
        <directionalLight position={[-2.2, 1.8, 2.8]} intensity={0.4} color={FORMA_VISION_HEX.teal} />

        {meshSource === 'meshy-glb' && props.meshyGlbUrl ? null : (
          <BodyMesh {...props} introRef={introRef} turntableRef={turntableRef} />
        )}
        {props.meshyGlbUrl && !glbLoadFailed ? (
          <MeshyGlbBoundary onError={handleGlbError}>
            <Suspense fallback={null}>
              <MeshyGlbMesh
                url={props.meshyGlbUrl}
                heightCm={props.heightCm}
                visible={glbReady}
                onReady={handleGlbReady}
                onError={handleGlbError}
              />
            </Suspense>
          </MeshyGlbBoundary>
        ) : null}
        <MeshSourceStamp source={meshSource} orbitUnlocked={orbitUnlocked} />

        {/* Projected future-self ghost: a translucent overlay of the projected body,
            shown only when showGhost is true AND ghostVector is non-null. It reuses the
            current body's per-tier build options so it is identical topology. Off by
            default, so the avatar is byte-identical to today until P5-T1c wires it. */}
        {meshSource === 'meshy-glb' ? null : (
          <GhostMesh
            ghostVector={props.ghostVector}
            showGhost={props.showGhost}
            buildOptions={TIER_BUILD[props.renderTier ?? 'cinematic']}
          />
        )}

        {meshSource === 'meshy-glb' ? null : (
          <AbWipeMesh
            wipeVector={props.wipeVector}
            wipeActive={props.wipeActive}
            wipeT={props.wipeT}
            buildOptions={TIER_BUILD[props.renderTier ?? 'cinematic']}
          />
        )}

        {meshSource === 'meshy-glb' ? null : (
          <MeasurementRing
            sex={props.sex}
            scan={props.scan}
            circumferences={props.circumferences}
            unit={props.unit}
            heightCm={props.heightCm}
            selectedBodyPart={props.selectedBodyPart}
            reducedMotion={props.reducedMotion}
            turntableRef={turntableRef}
          />
        )}

        {/* Prop-driven orange emphasis accent: fires once at emphasisRegion then
            disposes. Unset means nothing renders. P7-T2: suppressed on lite (pure
            GPU decoration -- additive blending over 14 points) while all data
            layers remain mounted. Cinematic is byte-identical: showParticlesForTier
            returns true and the block evaluates to the same mount as today. */}
        {showParticlesForTier(props.renderTier ?? 'cinematic') && (
          <EmphasisParticles
            sex={props.sex}
            scan={props.scan}
            circumferences={props.circumferences}
            unit={props.unit}
            heightCm={props.heightCm}
            emphasisRegion={props.emphasisRegion}
            reducedMotion={props.reducedMotion}
          />
        )}

        {/* Measurements overlay: staggered callouts with leader lines and anchor dots
            for every circumference. Only renders on the measurements tab. */}
        <MeasurementCallouts
          sex={props.sex}
          scan={props.scan}
          circumferences={props.circumferences}
          unit={props.unit}
          heightCm={props.heightCm}
          activeTab={props.activeTab}
          reducedMotion={props.reducedMotion}
        />

        {/* Subtle plasma plate glow — no postprocessing bloom package. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={-1}>
          <circleGeometry args={[0.92, 48]} />
          <meshBasicMaterial
            color={FORMA_VISION_HEX.teal}
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>

        {/* Soft contact shadow grounds the body. Skipped on WebKit — the extra
            RT is a known first-paint / context-loss trigger on iPhone. */}
        {isSafariWebGLHost() ? null : (
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.42}
            scale={3.6}
            blur={2.8}
            far={2.4}
            resolution={256}
            color={FORMA_VISION_HEX.navy}
          />
        )}

        <OrbitControls
          ref={controlsRef}
          // Turntable azimuth only: no panning, a clamped polar range so the
          // camera cannot tumble under the floor or over the crown, and a gentle
          // zoom clamp. Brief 60: locked until F3 settle (200ms), then unlock.
          enablePan={false}
          enableRotate={orbitUnlocked}
          // Inertial orbit: damping lets a drag glide to rest. Under frameloop
          // "demand" onChange keeps invalidating while it settles, then stops.
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI * 0.28}
          maxPolarAngle={Math.PI * 0.62}
          minDistance={ORBIT_DISTANCE_MIN}
          maxDistance={ORBIT_DISTANCE_MAX}
          // No built-in auto-rotate: the idle turntable owns rotation so it can pause
          // on interaction and stay disabled under reduced motion.
          autoRotate={false}
          target={[0, TARGET_Y, 0]}
          // drei's OrbitControls already calls invalidate on every change event, so
          // the inertial damping settle paints under frameloop "demand" and then goes
          // quiet on its own; no custom onChange invalidation is needed here.
          //
          // A drag start is an interaction: pause the turntable and skip the intro.
          onStart={() => {
            turntableRef.current?.notifyInteraction();
            skipIntro();
          }}
          // A drag end re-arms the idle countdown. Also signals the telemetry
          // seam (P8-T1b): one avatar_rotated event per gesture, fire-and-forget.
          onEnd={() => {
            turntableRef.current?.notifyInteraction();
            props.onOrbitEnd?.();
          }}
        />

        <CameraChoreography
          selectedBodyPart={props.selectedBodyPart}
          reducedMotion={props.reducedMotion}
          controlsRef={controlsRef}
          turntableRef={turntableRef}
        />

        <VisibilityPump containerRef={containerRef} />

        <FirstPaintWatchdog onFirstPaint={props.onFirstInteractive} />

        {/* Runtime frame-budget monitor: observes rendered-frame duration and asks
            the provider to step the tier down on sustained jank. Only mounted when a
            handler is wired, so the default path stays byte-identical. */}
        {props.onBudgetMissed ? (
          <FrameBudgetMonitor
            onBudgetMissed={props.onBudgetMissed}
            renderTier={props.renderTier ?? 'cinematic'}
          />
        ) : null}
      </Canvas>
    </div>
  );
}

'use client';

// The react-three-fiber scene for the FormaVision 3D avatar (Prompt 210b, P1-T4).
//
// This module is dynamically imported (ssr:false) by FormaVision3DAvatar, so the
// whole three bundle stays out of the SSR and first-paint path. It composes the
// mounted body geometry plus wireframe glow material into a demand-driven Canvas:
// nothing renders until an interaction, a remount, or a visibility change asks for
// a frame. A constrained OrbitControls allows turntable azimuth with a clamped
// polar range and no panning, a soft contact-shadow floor grounds the body, and a
// faint emissive light pair lifts the navy fill (the glow itself is in the shader).
//
// Lifecycle contract honored here: dispose the mounted body on unmount, pause
// rendering when the canvas leaves the viewport (IntersectionObserver) or the tab
// is hidden (visibilitychange), and never run an idle turntable when reducedMotion
// is set (no auto-spin is started anywhere; motion choreography is Phase 2).

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Mesh, Spherical, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { sampleBodyPositions } from '@/lib/formavision/geometry/sampleBodyPositions';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  createMaterializeIntro,
  createMorphController,
  createCameraFramingController,
  createIdleTurntable,
  createHighlightController,
  createOverlayController,
  useDemandScheduler,
  type CameraFraming,
  type IdleTurntable,
  type MaterializeIntro,
} from '@/lib/formavision/motion';
import { ringLoopForRegion } from '@/lib/formavision/geometry/ringLoopForRegion';
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
import type { Sex } from '@/lib/formavision/geometry/types';
import { mountBodyGeometry } from './mountBodyGeometry';
import { MeasurementRing } from './MeasurementRing';
import { EmphasisParticles } from './EmphasisParticles';

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
  // Lite tier trims geometry density for low-power devices; cinematic is full.
  renderTier?: 'cinematic' | 'lite';
}

// Vertical / radial density per render tier. Lite keeps the silhouette readable
// while roughly halving the row count for low-power GPUs.
const TIER_BUILD = {
  cinematic: { radialSegments: 40, verticalSegments: 48 },
  lite: { radialSegments: 28, verticalSegments: 28 },
} as const;

// The body geometry is authored in meters with the floor at y = 0; this lifts the
// camera target to roughly mid-torso so the avatar sits centered in the frame.
const TARGET_Y = 0.9;

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

  // Topology-affecting inputs only. sex keeps the same ring ids and build options,
  // so it morphs; renderTier changes the segment counts (the vertex count), which
  // changes topology, so it must remount. The mount is keyed on that pair, built
  // from the param vector live at mount time, and disposed on remount/unmount.
  const mounted = useMemo(() => {
    return mountBodyGeometry(paramVector, { build: buildOptions });
    // Remount only when topology changes (the build options). A param-vector change
    // is handled by the morph effect below, not by rebuilding here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildOptions]);

  // Request a frame whenever a fresh body is mounted (demand loop is otherwise idle).
  useEffect(() => {
    invalidate();
  }, [mounted, invalidate]);

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
  const morphedBodyRef = useRef<typeof mounted | null>(null);
  useEffect(() => {
    const geometry = mounted.geometry;
    const positionAttr = geometry.getAttribute('position');
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
      paramVector,
    );

    // A fresh mount is already built at this param vector, so the first pass for a
    // given body is a no-op (the intro owns first paint). Only a param-vector change
    // against the same body morphs.
    if (morphedBodyRef.current === mounted) {
      // Pause the idle turntable for the duration of the morph so the camera does
      // not spin while the body changes shape; recomputeNormals releases it.
      props.turntableRef.current?.setSuspended(true);
      controller.morphTo(paramVector);
    } else {
      morphedBodyRef.current = mounted;
    }

    return () => {
      controller.cancel();
    };
    // reducedMotion is read at morph time; buildOptions and scheduler are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, paramVector, invalidate]);

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
      reducedMotion: props.reducedMotion,
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
        return controls ? readControlsFraming(controls) : { targetY: TARGET_Y, distance: 3.2 };
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

export default function FormaVisionCanvas(props: FormaVisionCanvasProps) {
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
  }

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full">
      <Canvas
        // Demand loop: frames are produced only on interaction, mount, or an
        // explicit invalidate. No continuous render, no idle spin.
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.0, 3.2], fov: 30, near: 0.1, far: 50 }}
        onPointerDown={skipIntro}
      >
        <color attach="background" args={[FORMA_VISION_HEX.navy]} />

        {/* Emissive-leaning light pair: the wireframe glow lives in the shader, so
            this only lifts the navy fill enough to read depth. */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[2, 4, 3]} intensity={0.35} />

        <BodyMesh {...props} introRef={introRef} turntableRef={turntableRef} />

        {/* The single measurement ring for the selected region. It draws on, counts
            its value up, and disposes when the selection clears. */}
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

        {/* Prop-driven orange emphasis accent: fires once at emphasisRegion then
            disposes. Unset means nothing renders. */}
        <EmphasisParticles
          sex={props.sex}
          scan={props.scan}
          circumferences={props.circumferences}
          unit={props.unit}
          heightCm={props.heightCm}
          emphasisRegion={props.emphasisRegion}
          reducedMotion={props.reducedMotion}
        />

        {/* Soft contact shadow grounds the body on the floor plane at y = 0. */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.35}
          scale={4}
          blur={2.4}
          far={2.2}
          resolution={256}
          color={FORMA_VISION_HEX.navy}
        />

        <OrbitControls
          ref={controlsRef}
          // Turntable azimuth only: no panning, a clamped polar range so the
          // camera cannot tumble under the floor or over the crown, and a gentle
          // zoom clamp.
          enablePan={false}
          // Inertial orbit: damping lets a drag glide to rest. Under frameloop
          // "demand" onChange keeps invalidating while it settles, then stops.
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI * 0.28}
          maxPolarAngle={Math.PI * 0.62}
          minDistance={2.2}
          maxDistance={4.5}
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
          // A drag end re-arms the idle countdown.
          onEnd={() => {
            turntableRef.current?.notifyInteraction();
          }}
        />

        <CameraChoreography
          selectedBodyPart={props.selectedBodyPart}
          reducedMotion={props.reducedMotion}
          controlsRef={controlsRef}
          turntableRef={turntableRef}
        />

        <VisibilityPump containerRef={containerRef} />
      </Canvas>
    </div>
  );
}

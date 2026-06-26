# Prompt 210a - FormaVision 3D Avatar: Gate Resolutions and Build Authorization

Authoritative decision record. Amends Prompt 210 (foundation) and is the precondition that
authorizes Prompt 210b (best in class). Read this before 210b.

Author: Gary Ferenczi, Founder and CEO, Farmceutica Wellness Ltd. Date: June 25, 2026. Revision A.
Filed verbatim-in-substance into the repo as the canonical record the 210b plan cites.

## 0. Standing rules (non-negotiable)
- Lucide React icons only, strokeWidth 1.5. No emojis in code, UI strings, logs, or copy.
- No em-dashes and no en-dashes anywhere (code, comments, copy). Hyphens in compound words are fine. grep the diff.
- Design tokens only: Deep Navy #1A2744 canvas, Card #1E3054 surfaces, Teal #2DA5A0 primary glow/accent,
  Orange #B75E18 secondary accent, Instrument Sans type. Status colors resolve through severityToken.
- Desktop and mobile built together with responsive Tailwind from the start.
- Append-only Supabase migrations. Never edit an applied migration. Never touch Supabase email templates.
- package.json is locked. Do not modify it without Gary explicit approval, routed to Gary only.
- getDisplayName for any agent name shown to the user. Gordon agent slug stays lowercase gordon.
- Resilience on every Supabase and external call: Promise.race 3 to 5 second timeout, try/catch fail-open, structured logging.
- Any value that cannot be computed renders as UNKNOWN with an estimated marker. Never 0, never fabricated.
- Bio Optimization Score is the only name for the score.

## 1. Purpose
Prompt 210 surfaced four decisions blocked on Gary. This record resolves all four so 210b proceeds without
ambiguity. Each resolution is authoritative. Changes to Prompt 210 are stated in Section 6.

## 2. Gate 1: body geometry is a code-generated parametric wireframe mesh
Decision: build the body in code as a parametric wireframe mesh lofted from the actual circumference numbers.
Do not author, download, or ship any GLB or GLTF base mesh. No external body mesh asset, so no licensing question.
Supersedes the GLB plus morph-target approach in Prompt 210 Sections 5.2 and 5.3.

### 2.1 Construction
- Cross-section levels (vertical axis): ankle, mid-calf, knee, mid-thigh, glute and hip, low waist, navel waist,
  chest, shoulder, neck base. Arms are separate lofts with their own levels: shoulder, mid-upper-arm, elbow,
  mid-forearm, wrist.
- Rings from measurements: each level is an ellipse whose perimeter equals the measured circumference at that
  region. Convert circumference to ellipse semi-axes using a region-specific front-to-side aspect ratio so the
  cross-section reads as a body, not a stack of circles (waist and chest wider side to side, thigh rounder).
  Solve the semi-axes from the circumference and the aspect ratio.
- Vertical placement: derive level heights and limb lengths from the user height, or from a height-normalized
  template scaled to the user height. Male and female use different default proportion and aspect-ratio templates,
  but the geometry is always sized by the user real numbers, never a guess.
- Loft: interpolate the rings vertically with a smooth Catmull-Rom path, sampling a fixed number of radial points
  per ring (target 40) and several vertical samples between defined levels, to produce a clean skinned
  BufferGeometry. Compute normals. Generate cylindrical UVs for the cell texture.
- Limbs, head, hands: arms are lofted tubes attached at the shoulders in a relaxed A-pose. The head is a simple
  capped or darkened ovoid (reference blacks out the head). Hands are mitten caps.

### 2.2 Why this strengthens later phases
The mesh is a pure function of the parameter vector (circumferences, height, aspect ratios). So shape
personalization, the live morph between scans, and the time-machine scrub all reduce to interpolating that vector
and updating ring radii. The 210b motion features are exact and data-true, not approximate. A measurement ring at
any level IS the cross-section, so the ring is the number, drawn.

### 2.3 UNKNOWN handling
A missing circumference falls back to the template default for that region and is visibly marked estimated.
Never 0, never silently faked.

## 3. Gate 2: dependencies, package.json stays locked
Decision: keep package.json locked. Ship 210b on the spec-defined fallbacks.
- @react-three/postprocessing (bloom). Fallback: fresnel rim + additive wireframe pass. No bloom, no new dependency.
- gsap (camera and timeline tweens). Fallback: manual eased lerp for camera moves and the morph timeline.
Optional upgrade: Gary may later approve those two packages in a single line and the build swaps fallbacks for the
real effects behind the same seams. Until then the locked-and-fallback path is the authorized default. No other
dependency is approved; any further package requires Gary explicit approval, routed to Gary only.

## 4. Gate 3: build on a feature branch
Decision: build 210b on a short-lived feature branch, not directly on main. A parallel 208 session is live on main
and this is a large multi-phase build, so isolation keeps both safe. Merge to main only when phase gates and OBRA
gates pass and Gary signs off. Scoped exception to the direct-push-to-main default.
(Implemented: branch feat/210b-formavision-3d-avatar, base 9d3c6529.)

## 5. Gate 4: add the additive first-scan read
Decision: add a small additive read for the first scan so the latest-versus-first body fat delta and the Notable
Changes summary (Prompt 210 Section 8) can render. Today the hook reads LIMIT 1 (latest only).
Constraints: the new read goes against the SAME body_tracker tables that serve the latest scan. No second source of
truth, no recompute. It selects the earliest qualifying scan (the first) alongside the existing latest, and the
comparison is a straight read of two existing rows. No migration expected; if one is required it is append-only and
presented to Gary first.

## 6. What this supersedes in Prompt 210
- 210 Section 5.2 (GLB asset gate) withdrawn. No external mesh asset. Geometry is the parametric wireframe mesh in Section 2.
- 210 Section 5.3 (morph targets or scale cage) replaced by parameter-vector personalization of the parametric mesh.
- 210 Section 5.4 (dependency gate) resolved per Section 3: locked package.json, fallbacks, optional later approval.
- 210 workflow (direct push to main) replaced for this build by the feature branch in Section 4.
- 210 Sections 6.4 and 8 (first-scan read) satisfied by the additive read in Section 5.
- The SMPL and SMPL-X ban is moot because no external mesh is used. The standing rule becomes: introduce no external body mesh.

## 7. Authorization
With these four resolutions in place, the build is authorized to proceed with 210b. Phase 0 of 210b runs first
(discovery, the parametric-mesh proof, the data wiring for genetics, trajectory, protocol, and telemetry, and
confirmation that no further dependency is needed). Nothing in 210b may regress the Prompt 210 foundation or the
2D fallback floor.

## 8. Reference files
- Prompt 210: foundation 3D avatar, data contract, 2D fallback.
- Prompt 210b: best-in-class build, authorized by this record.
- Prompt 210 Appendix A: the FormaVision 3D Avatar visual target frames.
- The body_tracker tables and the existing latest-scan read (located in 210b Phase 0).

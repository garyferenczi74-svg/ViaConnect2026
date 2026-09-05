# MOTION-SPEC — labeled 2D floor ↔ 3D handoff

Proud, not flashy. CSS opacity + `morph_3d`. Do **not** SVG→mesh the illustration.
Do **not** paint a stock person as the Ready result.

| Beat | Duration | Easing | What happens |
| --- | --- | --- | --- |
| Enter plate | 180ms | ease-out | Plate chrome scale 0.985→1. Figure opacity stays 1. |
| Floor paint | 0ms | — | Labeled designed 2D floor paints immediately. Never blank. Never Picasso. Never alien AnatomicalFloor. |
| Half morph (F2) | 280ms | — | Overlaps the F3 crossfade. Anatomical → particle grid. |
| 3D ready (F3) | 420ms | cubic-bezier(0.22, 1, 0.36, 1) | Floor opacity 1→0, `morph_3d` 0→1. Designed holographic grid. |
| Settle | 200ms | ease-out | Hold after the crossfade, then orbit unlock. |
| Fallback reverse | 240ms | ease-out | Floor back + honest notice. Caption says this is not the scan. |
| Sex toggle | 200ms | ease | Crossfade male ↔ female plates. |

SSOT constants: `src/lib/formavision/motion/floorMotionSpec.ts`.

Default plate view remains **rear** for the 3D camera (Brief 58 rear ¾). The 2D floor is a single designed A-pose outline used only while loading or after a hard failure.

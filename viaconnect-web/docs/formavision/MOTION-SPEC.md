# MOTION-SPEC — Picasso floor ↔ 3D handoff

Proud, not flashy. CSS opacity + `morph_3d`. Do **not** SVG→mesh the illustration.

| Beat | Duration | Easing | What happens |
| --- | --- | --- | --- |
| Enter plate | 180ms | ease-out | Plate chrome scale 0.985→1. Figure opacity stays 1. |
| Floor paint | 0ms | — | Picasso pack paints immediately. Never blank. |
| 3D ready | 420ms | cubic-bezier(0.22, 1, 0.36, 1) | Floor opacity 1→0, `morph_3d` 0→1. |
| Settle | 200ms | — | Hold after the crossfade. |
| Fallback reverse | 240ms | ease-out | Floor back + honest notice. |
| Sex toggle | 200ms | ease | Crossfade male ↔ female plates. |

SSOT constants: `src/lib/formavision/motion/floorMotionSpec.ts`.

Default plate view is **rear** (Brief 58 rear ¾). Front plates ship for an explicit `view="front"`.

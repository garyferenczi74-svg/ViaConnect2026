# Prompt 210g Proof Pack

**Status:** Geometry repair landed; Gary production walk-on acceptance is non-delegable.  
**Production URL:** https://www.viaconnectapp.com/body-tracker/composition  
**Diagnosis:** [210g-diagnosis.md](./210g-diagnosis.md)

## What shipped

| Item | Detail |
|------|--------|
| Angular shape-correction | `geometry/shapeCorrection.ts` + `anatomicalRingPoints` |
| Radial density | Default 64; cinematic tier 64 (was 40) |
| Integrated head | Continuous loft from neck ring (no detached sphere) |
| Arm hang | 25 degree abduction |
| Ghost | Same `buildBodyGeometry` engine; first-scan Comparison Overlay + Future Self seam |
| Anti-regression | `shapeCorrectionSanity.test.ts` (fails on pure-ellipse / unity correction) |

## Automated gates

```bash
cd viaconnect-web
npx vitest run src/lib/formavision/geometry/__tests__/shapeCorrectionSanity.test.ts
npx vitest run src/lib/formavision/geometry/__tests__/buildBodyGeometry.test.ts
npx vitest run src/lib/formavision/geometry/__tests__/anatomicalLevels.test.ts
```

Deliberate degradation path: `buildBodyGeometry(vector, { disableShapeCorrection: true })` must differ from the corrected build (asserted in CI).

## Side-by-side stills (attach after Gary walk-on)

| Capture | Path |
|---------|------|
| Production male front (post-fix) | _pending Gary device_ |
| Production female three-quarter | _pending Gary device_ |
| Ghost comparison on | _pending Gary device_ |
| Against canonical PNG smoothness class | _pending Gary device_ |

## Production acceptance (Gary)

- [ ] Continuous anatomical body, no barrel tubes  
- [ ] Integrated head  
- [ ] Smooth shoulder / waist / hip  
- [ ] Seamless 25 degree arms  
- [ ] Ghost toggle with honest empty state  
- [ ] Transparent canvas + landmarks intact  

## No package.json / no external mesh

Confirmed: geometry-only math changes; r3f/drei/three pins unchanged; no GLB/GLTF/SMPL.

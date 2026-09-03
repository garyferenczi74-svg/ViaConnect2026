# BRIEF 59 amend — designed 2D floor is loading / hard-failure only

PR #181 shipped the Picasso pack (photorealistic stock Male/Female PNGs) as the always-paint plate. Production Ready scans then showed another man's body. That is a FAIL.

## Locked answers (this amend)

1. **Ready scan result is the parametric 3D mesh.** Four views + available measurements → `scanToParamVector` + `BODY_BUILD_BY_TIER` → scan-derived morph → real-time WebGL. Never a stock photograph.
2. **2D may appear only as an explicitly labeled loading or hard-failure state.** Designed anatomical SVG from #180. Never Picasso. Never someone else's body. Never implied as the user's result.
3. **Never-empty stays.** Plate paints immediately. WebGL dead → labeled designed 2D + honest fallback notice. Never stick. Never blank. Never a third-party person.
4. **Photo texture projection is not shipped.** No backend appearance model. Use the existing procedural plasma-teal material. Do not fake a personalized texture.

## Floor (honesty path only)

- `FormaVisionAnatomicalFloor` renders the designed muscle-line A-pose SVG by sex.
- `data-floor="anatomical-2d"` and `data-floor-role="loading" | "unavailable"`.
- Visible caption: loading outline is not the user's body; unavailable outline is not the scan.
- Wired on recovering, pending, plate underlay, and fellBack children.
- Picasso pack is retired as a scan result. Product path must not import `picassoPack`.

## 3D (product path)

- Product mesh stays `scanToParamVector` + `BODY_BUILD_BY_TIER` (Brief 58 Phase 1).
- Ready BF / overlay / measured girths drive morph via `resolveAvatarCircumferences`.
- No SVG-to-photogrammetry conversion.
- Teal density / volume / rim from #178 stays.

## Diagnostics (phone-readable)

Footprint + live canvas stamp `data-surface`, `data-tier`, `data-morph`, `data-morph-source`, `data-morph-bf`, `data-appearance="procedural"`, `data-result`, `data-floor-role`.

## KILLS

Picasso / stock person as Ready result. Circle head. Stick LocalSilhouette. Blank plate. Fake photo texture.

## Out

- SVG-to-mesh
- Purple brand
- Abandoning never-empty
- `--prod` / `package.json`
- Inventing a personalized texture without a backend model

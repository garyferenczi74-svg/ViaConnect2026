// Prompt 191 (2026-06-12): per card background media for the My Genetics hub.
//
// One typed config drives the genetics bento cards, the same way the My
// Biology SURFACES entries and the My Nutrition NUTRITION_CARD_MEDIA map
// describe theirs. Every entry here is a gradient placeholder: the video seam
// stays open so Gary can drop a real asset later. To swap one card to a real
// video, change that entry to:
//   { kind: "video", src: "<storage url>", poster: "<poster url>",
//     objectPosition: "center", gradientClass: <the same constant> }
// or, for a still image, set kind: "image" with src + objectPosition. No other
// change is needed: the gradientClass stays as the fail open placeholder. No
// external or lifestyle video URL is referenced here on purpose.
//
// Standing rules honored: tokens only. The gradients below use ONLY the four
// design tokens, expressed as rgba so they can carry an alpha for the corner
// glow: Teal #2DA5A0 -> 45,165,160; Orange #B75E18 -> 183,94,24; Card #1E3054
// -> 30,48,84; Deep Navy #1A2744 -> 26,39,68. No emojis, no em or en dashes.

import type { SurfaceMedia } from "@/components/body-tracker/hub/hubConfig";

// Corner anchored radial gradients, mirroring the My Biology hubConfig
// pattern: a token tinted glow in one corner that fades through the Card token
// into the Deep Navy token. Teal for the data and helix surfaces, Orange for
// the two upload and the formulation surfaces.

// Teal dominant hero glow, anchored top left and slightly stronger.
export const MEDIA_HERO_HELIX =
  "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(45,165,160,0.35)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]";

// Teal corner glows for the data surfaces.
export const MEDIA_TEAL_TL =
  "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]";
export const MEDIA_TEAL_TR =
  "bg-[radial-gradient(110%_110%_at_100%_0%,rgba(45,165,160,0.28)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]";
export const MEDIA_TEAL_BL =
  "bg-[radial-gradient(110%_110%_at_0%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]";
export const MEDIA_TEAL_BR =
  "bg-[radial-gradient(110%_110%_at_100%_100%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]";

// Orange corner glows for the upload and formulation surfaces.
export const MEDIA_ORANGE_BR =
  "bg-[radial-gradient(120%_120%_at_100%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]";
export const MEDIA_ORANGE_BL =
  "bg-[radial-gradient(110%_110%_at_0%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]";

// One media descriptor per genetics hub card id. Every entry is a gradient
// placeholder with src left unset, keeping the video seam open. Keys match the
// card ids the later UI tasks mount: genex360Complete, uploadDna, uploadLab,
// snpFormulations, orderPanels, yourVariants. The hero glow is keyed "hero".
export const GENETICS_CARD_MEDIA: Record<string, SurfaceMedia> = {
  hero: {
    kind: "gradient",
    gradientClass: MEDIA_HERO_HELIX,
  },
  genex360Complete: {
    kind: "gradient",
    gradientClass: MEDIA_TEAL_TL,
  },
  // Prompt 191 Task D (2026-06-12): TEAL upload surface, anchored bottom left.
  // The DNA raw file upload reads teal to match the teal DNA treatment on the
  // current /genetics page (the Lab upload stays orange below), so the bento
  // keeps the same DNA teal / Lab orange continuity the page already teaches.
  uploadDna: {
    kind: "gradient",
    gradientClass: MEDIA_TEAL_BL,
  },
  // Orange upload surface, anchored bottom left so the two upload tiles read
  // as a pair without sharing the exact same corner.
  uploadLab: {
    kind: "gradient",
    gradientClass: MEDIA_ORANGE_BL,
  },
  // Orange formulation surface.
  snpFormulations: {
    kind: "gradient",
    gradientClass: MEDIA_ORANGE_BR,
  },
  orderPanels: {
    kind: "gradient",
    gradientClass: MEDIA_TEAL_TR,
  },
  yourVariants: {
    kind: "gradient",
    gradientClass: MEDIA_TEAL_BR,
  },
};

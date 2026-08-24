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
  // The large Your Genetic Blueprint card carries the teal hero glow; the moving
  // media now lives on the GeneX360 Complete inner card below.
  hero: {
    kind: "gradient",
    gradientClass: MEDIA_HERO_HELIX,
  },
  // Prompt 193d (2026-06-12): the GeneX360 Complete inner hero card (the bento's
  // background hero) plays the White DNA video from the Hero Videos bucket.
  // CardMedia renders it muted, looped, playsInline, and IntersectionObserver
  // gated; under reduced motion or any load failure it falls open to the
  // MEDIA_TEAL_TL gradient below (no poster is set, so the gradient is the still).
  genex360Complete: {
    kind: "video",
    src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/White%20DNA.mp4",
    objectPosition: "center",
    gradientClass: MEDIA_TEAL_TL,
  },
  // Prompt 193d / 204 / 219c: Mouth Swab still from Hero Images.
  // Native asset is extremely tall (~1200x4167, aspect ~0.29). CardMedia
  // object-cover on that ratio zooms into a dark crop and hides the subject.
  // Prompt 219c (b): serve a card-aspect crop via Supabase transform
  // (900x600, resize=cover, center) so cover fill matches the three video
  // cards without distortion. Original object path is untouched; only the
  // render/image query changes. ImageMedia now honors objectFit/Position.
  uploadDna: {
    kind: "image",
    src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/render/image/public/Hero%20Images/Mouth%20Swab%201.png?width=900&height=600&resize=cover&quality=75",
    objectPosition: "center",
    objectFit: "cover",
    gradientClass: MEDIA_TEAL_BL,
  },
  // Prompt 193d: Upload Lab Results Blood Test video. Cover + center (subjects
  // are framed for full-bleed cards). Same scrim via BentoTile.
  uploadLab: {
    kind: "video",
    src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Blood%20Test.mp4",
    objectPosition: "center",
    objectFit: "cover",
    gradientClass: MEDIA_ORANGE_BL,
  },
  // Prompt 193d: Browse SNP Support Formulations video.
  snpFormulations: {
    kind: "video",
    src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/SNP%20Support.mp4",
    objectPosition: "center",
    objectFit: "cover",
    gradientClass: MEDIA_ORANGE_BR,
  },
  // Prompt 193d: Unlock Your Genetic Blueprint video.
  orderPanels: {
    kind: "video",
    src: "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/unlock%20your%20genetic%20blueprint.mp4",
    objectPosition: "center",
    objectFit: "cover",
    gradientClass: MEDIA_TEAL_TR,
  },
  yourVariants: {
    kind: "gradient",
    gradientClass: MEDIA_TEAL_BR,
  },
};

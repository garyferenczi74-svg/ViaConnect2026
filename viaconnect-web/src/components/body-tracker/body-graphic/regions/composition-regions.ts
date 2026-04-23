// Prompt #118 — Composition zone registry. Mirrors body_regions rows where
// region_type = 'composition'. Keep in sync with migration _190 seed.

import type { RegionDefinition } from "../BodyGraphic.types";

export const compositionRegions: readonly RegionDefinition[] = [
  { id: "comp-head",       displayName: "Head & Face", displayNameFr: "Tête et visage", regionType: "composition", anatomicalGroup: "upper-body", hasView: ["front", "back"], displayOrder: 10  },
  { id: "comp-neck",       displayName: "Neck",        displayNameFr: "Cou",            regionType: "composition", anatomicalGroup: "upper-body", hasView: ["front", "back"], displayOrder: 20  },
  { id: "comp-chest",      displayName: "Chest",       displayNameFr: "Poitrine",       regionType: "composition", anatomicalGroup: "upper-body", hasView: ["front"],         displayOrder: 30  },
  { id: "comp-upper-back", displayName: "Upper Back",  displayNameFr: "Haut du dos",    regionType: "composition", anatomicalGroup: "upper-body", hasView: ["back"],          displayOrder: 40  },
  { id: "comp-abdomen",    displayName: "Abdomen",     displayNameFr: "Abdomen",        regionType: "composition", anatomicalGroup: "core",       hasView: ["front"],         displayOrder: 50  },
  { id: "comp-lower-back", displayName: "Lower Back",  displayNameFr: "Bas du dos",     regionType: "composition", anatomicalGroup: "core",       hasView: ["back"],          displayOrder: 60  },
  { id: "comp-right-arm",  displayName: "Right Arm",   displayNameFr: "Bras droit",     regionType: "composition", anatomicalGroup: "upper-limb", hasView: ["front", "back"], displayOrder: 70,  isBilateral: true },
  { id: "comp-left-arm",   displayName: "Left Arm",    displayNameFr: "Bras gauche",    regionType: "composition", anatomicalGroup: "upper-limb", hasView: ["front", "back"], displayOrder: 80,  isBilateral: true },
  { id: "comp-right-leg",  displayName: "Right Leg",   displayNameFr: "Jambe droite",   regionType: "composition", anatomicalGroup: "lower-limb", hasView: ["front", "back"], displayOrder: 90,  isBilateral: true },
  { id: "comp-left-leg",   displayName: "Left Leg",    displayNameFr: "Jambe gauche",   regionType: "composition", anatomicalGroup: "lower-limb", hasView: ["front", "back"], displayOrder: 100, isBilateral: true },
] as const;

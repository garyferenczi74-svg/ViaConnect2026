export { compositionRegions } from "./composition-regions";
export { muscleRegions } from "./muscle-regions";
export * from "./region-metadata";

import { compositionRegions } from "./composition-regions";
import { muscleRegions } from "./muscle-regions";
import type { RegionDefinition } from "../BodyGraphic.types";

export const allRegions: readonly RegionDefinition[] = [...compositionRegions, ...muscleRegions];

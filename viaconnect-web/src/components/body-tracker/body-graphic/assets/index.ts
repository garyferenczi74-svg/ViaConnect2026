export { MaleFront } from "./MaleFront";
export { MaleBack } from "./MaleBack";
export { FemaleFront } from "./FemaleFront";
export { FemaleBack } from "./FemaleBack";

import { MaleFront } from "./MaleFront";
import { MaleBack } from "./MaleBack";
import { FemaleFront } from "./FemaleFront";
import { FemaleBack } from "./FemaleBack";

export const SVG_REGISTRY = {
  "male-front":   MaleFront,
  "male-back":    MaleBack,
  "female-front": FemaleFront,
  "female-back":  FemaleBack,
} as const;

export type SvgKey = keyof typeof SVG_REGISTRY;

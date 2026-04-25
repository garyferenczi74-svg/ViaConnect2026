/**
 * Marshall rule registry aggregate. Every rule from every pillar is exported
 * here for a single RuleEngine bootstrapping call.
 */

import type { Rule } from "../engine/types";
import { claimsRules } from "./claims";
import { peptideRules } from "./peptide";
import { geneticRules } from "./genetic";
import { practitionerRules } from "./practitioner";
import { mapRules } from "./map";
import { commsRules } from "./comms";
import { privacyRules } from "./privacy";
import { brandRules } from "./brand";
import { auditRules } from "./audit";
import { socialRules } from "./social";
import { precheckRules } from "./precheck";
import { counterfeitRules } from "./counterfeit";
import { marketingRules } from "./marketing";

export const allRules: Rule[] = [
  ...claimsRules,
  ...peptideRules,
  ...geneticRules,
  ...practitionerRules,
  ...mapRules,
  ...commsRules,
  ...privacyRules,
  ...brandRules,
  ...auditRules,
  ...socialRules,
  ...precheckRules,
  ...counterfeitRules,
  ...marketingRules,
];

export {
  claimsRules,
  peptideRules,
  geneticRules,
  practitionerRules,
  mapRules,
  commsRules,
  privacyRules,
  brandRules,
  auditRules,
  socialRules,
  precheckRules,
  counterfeitRules,
  marketingRules,
};

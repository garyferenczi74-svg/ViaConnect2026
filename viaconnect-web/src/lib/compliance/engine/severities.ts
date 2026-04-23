/**
 * Internal re-export so engine/ files can import severity helpers from a
 * single relative path while keeping the config-mutation surface in
 * ../config/severities.ts.
 */
export { BLOCKING_SEVERITIES, AUTO_REMEDIATE_CEILING, SEVERITY_LABELS, getEnforcementMode, isBlocking } from "../config/severities";
export { severityRank, highestSeverity } from "./types";

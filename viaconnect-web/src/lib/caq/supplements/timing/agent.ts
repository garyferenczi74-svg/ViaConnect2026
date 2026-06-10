// Prompt 185 Step 4: the single swap point for the supplements-timing agent.
//
// To consolidate supplement timing into Gordon later, change ONLY this constant
// (and the seed-data ownership). Every user-facing reference to the agent
// resolves through getDisplayName(SUPPLEMENT_TIMING_AGENT_SLUG); no UI hardcodes
// the display name. getDisplayName is for agent slugs only.
export const SUPPLEMENT_TIMING_AGENT_SLUG = 'hannah';

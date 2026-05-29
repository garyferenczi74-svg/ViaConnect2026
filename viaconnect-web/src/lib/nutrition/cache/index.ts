// Prompt #170 Phase 1d: barrel for the NutriVision recognition cache layer.
// Downstream callers (detect orchestrator, future resolver) import from here.

export {
  computeSha256,
  computePHash64,
  hammingDistance64,
  lookupCache,
  writeCache,
  type CacheHit,
  type CacheLookupOpts,
  type CacheWriteOpts,
} from './recognition-cache';

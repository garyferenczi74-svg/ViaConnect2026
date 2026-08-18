/**
 * Prompt 222: competitor_app titles for Heads Up Health KB seed.
 * Seed SQL: supabase/migrations/20260820121100_prompt_222_headsup_kb_seed.sql
 * Internal strategy only. consumer_safe = false.
 */

export const HEADSUP_KB_TITLES = [
  "Heads Up Health platform overview",
  "Heads Up Health feature matrix",
  "Heads Up Health integration inventory",
  "Heads Up Health pricing structure",
  "Heads Up Health review themes",
] as const;

export type HeadsupKbTitle = (typeof HEADSUP_KB_TITLES)[number];

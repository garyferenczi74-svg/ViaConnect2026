-- Prompt #149a: PLP Product Image Frame Fit (GeneX360 Testing and Diagnostics)
-- Schema migration: append optional display_config jsonb column to products.
--
-- Applied to live DB on 2026-05-03 via mcp__claude_ai_Supabase__apply_migration
-- (cloud version 20260503230426). This file is the local source-of-truth copy.
--
-- Idempotent: safe to re-run via "if not exists".

alter table public.products
  add column if not exists display_config jsonb
  default '{}'::jsonb;

comment on column public.products.display_config is
  'Per-product display tuning for storefront thumbnails per Prompt #149a. Schema: { fit?: cover | contain, scale?: number, position?: string, padding?: tight | default | loose }. All fields optional. Empty object means use component defaults.';

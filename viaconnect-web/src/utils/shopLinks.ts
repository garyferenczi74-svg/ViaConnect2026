// src/utils/shopLinks.ts
//
// Centralised URL helpers for the Shop. Resolves peptide slugs to the
// /shop/peptides/{slug} catalog detail route, plus a generic search
// helper that mirrors `geneticsShopLinks.ts` for non-peptide products.
//
// Created for Prompt #53 — Peptide Catalog. The catalog page lives at
// /shop/peptides and individual peptide profiles at /shop/peptides/{slug}.
// Every peptide profile in src/data/peptideCatalog.ts has a unique slug.

import { PEPTIDE_CATALOG, type PeptideProduct } from "@/data/peptideCatalog";

/**
 * Build the canonical URL for a peptide profile detail page.
 * Accepts either a slug string or a PeptideProduct object.
 */
export function getPeptideShopUrl(peptide: PeptideProduct | string): string {
  const slug = typeof peptide === "string" ? peptide : peptide.slug;
  return `/shop/peptides/${encodeURIComponent(slug)}`;
}

/**
 * Resolve a peptide name (case-insensitive) to its catalog slug. Useful
 * when downstream systems (recommendations, share-with-practitioner
 * exports, AI suggestions) reference peptides by display name and need
 * to deep-link back into the catalog.
 *
 * Returns null if no peptide matches.
 */
export function resolvePeptideSlugByName(name: string): string | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const match = PEPTIDE_CATALOG.find(
    (p) =>
      p.name.toLowerCase() === needle ||
      p.slug.toLowerCase() === needle ||
      p.name.toLowerCase().startsWith(needle),
  );
  return match?.slug ?? null;
}

/**
 * Convenience: resolve a peptide name straight to its detail URL, or
 * fall back to the catalog list page if the name doesn't match anything.
 */
export function getPeptideShopUrlByName(name: string): string {
  const slug = resolvePeptideSlugByName(name);
  return slug ? getPeptideShopUrl(slug) : "/shop/peptides";
}

/** Catalog landing page. */
export function getPeptideCatalogUrl(): string {
  return "/shop/peptides";
}

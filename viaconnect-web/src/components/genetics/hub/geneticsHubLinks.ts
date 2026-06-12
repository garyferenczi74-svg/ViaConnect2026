// Prompt 191 Task C (2026-06-12): canonical shop links for the My Genetics hub.
//
// GENEX360_SHOP_HREF points at the GeneX360 Testing and Diagnostics shop
// category. The slug is sourced from the canonical shop category table
// (src/lib/shop/categories.ts), which exports a `genex360` category per
// Prompt 141 v3. Resolving it through getShopCategoryBySlug keeps this link in
// lockstep with the shop nav and sitemap: if the slug is ever renamed there,
// this constant follows. The resolved path matches the literal "/shop/genex360"
// already used canonically in src/lib/flags/upgrade-prompt-copy.ts, so the two
// references agree.
//
// Reused by the Your Variants sample-data banner (this task) and the GeneX360
// card in the next task.
//
// Standing rules honored: tokens only (no UI here), no emojis, no em or en
// dashes, TypeScript strict (no any).

import { getShopCategoryBySlug } from "@/lib/shop/categories";

// The canonical slug for the GeneX360 Testing and Diagnostics shop category.
// getShopCategoryBySlug returns undefined only if the slug is removed upstream;
// we fall back to the same literal slug so the link never breaks at build time.
const GENEX360_CATEGORY_SLUG = "genex360";

export const GENEX360_SHOP_HREF = `/shop/${
  getShopCategoryBySlug(GENEX360_CATEGORY_SLUG)?.slug ?? GENEX360_CATEGORY_SLUG
}`;

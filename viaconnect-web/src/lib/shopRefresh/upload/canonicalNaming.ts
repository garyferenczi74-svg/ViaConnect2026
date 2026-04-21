// Prompt #106 §4.2 — canonical naming convention validator.
//
// Every upload MUST match {category_slug}/{sku_slug}.png (primary) or
// {category_slug}/{sku_slug}-v{N}.png (versioned). Non-conforming uploads
// are rejected at the API boundary (§3.7 HARD STOP).

import { IN_SCOPE_CATEGORY_SLUGS, type InScopeCategorySlug } from '../types';

const IN_SCOPE_SET: ReadonlySet<string> = new Set<string>(IN_SCOPE_CATEGORY_SLUGS);

export interface ParsedObjectPath {
  categorySlug: InScopeCategorySlug;
  skuSlug: string;
  version: number; // 1 for primary (no -v suffix); 2+ for versioned copies
  extension: 'png' | 'jpeg' | 'jpg';
}

export type NamingValidationResult =
  | { ok: true; parsed: ParsedObjectPath }
  | { ok: false; reason: string };

/** SKU slug rules: lowercase letters, digits, hyphens, ≤ 64 chars. */
const SKU_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Placeholders live under a known subdirectory and are allowed. */
const PLACEHOLDER_PREFIX = 'placeholders/';

export function isPlaceholderPath(path: string): boolean {
  return path.startsWith(PLACEHOLDER_PREFIX);
}

/**
 * Validate + parse a storage object path (bucket-relative — no leading slash).
 * Returns { ok: true, parsed } on success, { ok: false, reason } otherwise.
 */
export function parseCanonicalObjectPath(path: string): NamingValidationResult {
  if (!path || typeof path !== 'string') {
    return { ok: false, reason: 'path is empty or not a string' };
  }
  if (path.startsWith('/')) {
    return { ok: false, reason: 'path must not start with /' };
  }
  if (path.includes('..') || path.includes('\\')) {
    return { ok: false, reason: 'path contains forbidden characters' };
  }

  // Placeholders permitted only under placeholders/ but not exposed to SKU
  // binding; callers that want to bind must see a category/sku path.
  if (isPlaceholderPath(path)) {
    return { ok: false, reason: 'placeholder paths cannot bind to a SKU' };
  }

  const parts = path.split('/');
  if (parts.length !== 2) {
    return { ok: false, reason: 'expected exactly two segments: {category_slug}/{sku_slug}.{ext}' };
  }
  const [categorySlug, filename] = parts as [string, string];

  if (!IN_SCOPE_SET.has(categorySlug)) {
    return {
      ok: false,
      reason: `category_slug "${categorySlug}" not in the 6 in-scope categories`,
    };
  }

  const extMatch = filename.match(/^(.+)\.(png|jpe?g)$/i);
  if (!extMatch) {
    return { ok: false, reason: 'filename must end in .png, .jpg, or .jpeg' };
  }
  const baseName = extMatch[1]!;
  const extRaw = extMatch[2]!.toLowerCase();
  const extension: ParsedObjectPath['extension'] =
    extRaw === 'jpg' ? 'jpg' : extRaw === 'jpeg' ? 'jpeg' : 'png';

  const versionMatch = baseName.match(/^(.+)-v(\d+)$/);
  let skuSlug = baseName;
  let version = 1;
  if (versionMatch) {
    skuSlug = versionMatch[1]!;
    version = parseInt(versionMatch[2]!, 10);
    if (!Number.isFinite(version) || version < 2) {
      return { ok: false, reason: `versioned filenames must use -v2 or higher, got -v${version}` };
    }
  }

  if (!SKU_SLUG_RE.test(skuSlug)) {
    return {
      ok: false,
      reason: `sku_slug "${skuSlug}" must be lowercase alphanumeric with hyphen separators`,
    };
  }
  if (skuSlug.length > 64) {
    return { ok: false, reason: 'sku_slug longer than 64 characters' };
  }

  return {
    ok: true,
    parsed: {
      categorySlug: categorySlug as InScopeCategorySlug,
      skuSlug,
      version,
      extension,
    },
  };
}

/**
 * Slugify an arbitrary SKU-or-name string to the canonical sku_slug shape.
 * Used at upload time to match a provided filename against master_skus rows.
 *
 * Rule worth noting: "+" translates to "-plus" rather than being stripped,
 * because the §4.2 canonical filenames were authored that way — e.g., the
 * SKU "MTHFR+" maps to "mthfr-plus.png", not "mthfr.png".
 */
export function slugifyForPath(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u2122\u00ae\u00a9]/g, '') // strip ™ ® © before any punctuation
    .replace(/['"]/g, '')
    .replace(/\+/g, '-plus-')             // preserve the "+" suffix convention
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function buildObjectPath(args: {
  categorySlug: InScopeCategorySlug;
  skuSlug: string;
  version?: number;
  extension?: ParsedObjectPath['extension'];
}): string {
  const ext = args.extension ?? 'png';
  const v = args.version ?? 1;
  const suffix = v > 1 ? `-v${v}` : '';
  return `${args.categorySlug}/${args.skuSlug}${suffix}.${ext}`;
}

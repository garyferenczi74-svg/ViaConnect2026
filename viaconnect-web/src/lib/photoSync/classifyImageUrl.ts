// Photo Sync prompt §3.1: classify each image_url into one of five buckets.
// Pure function — does not check whether the object actually exists in
// Storage. The audit script supplies a `bucketObjectsByPath` set so the
// classifier can promote VALID_SUPABASE → STALE_SUPABASE on a miss.

import { PUBLIC_PREFIX, type ImageUrlClassification } from './types';

const PLACEHOLDER_RE = /\/(placeholder|default|coming[-_]?soon|images\/fallback)\b/i;

export interface ClassifyArgs {
  image_url: string | null | undefined;
  bucket_object_paths_set: ReadonlySet<string>;  // full_path values from the manifest
}

export function classifyImageUrl({ image_url, bucket_object_paths_set }: ClassifyArgs): ImageUrlClassification {
  if (image_url == null || image_url.trim().length === 0) return 'NULL';
  const url = image_url.trim();

  if (url.startsWith(PUBLIC_PREFIX)) {
    const path = url.slice(PUBLIC_PREFIX.length);
    return bucket_object_paths_set.has(path) ? 'VALID_SUPABASE' : 'STALE_SUPABASE';
  }

  if (PLACEHOLDER_RE.test(url)) return 'PLACEHOLDER';

  return 'EXTERNAL';
}

// Photo Sync prompt §3.2: filename normalizer.
//
//   normalize(name) = toLowerCase(name)
//                    .replace(/\.(webp|jpg|jpeg|png|avif)$/i, '')
//                    .replace(/[^a-z0-9]+/g, '-')
//                    .replace(/^-+|-+$/g, '')

const EXT_RE = /\.(webp|jpg|jpeg|png|avif)$/i;

export function normalizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(EXT_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Extract the basename of a path (everything after the last `/`) before normalizing.
// Used when matching `snp-support-formulations/mthfr-plus-folate-metabolism.png`
// — both the full path and the basename should be candidate keys.
export function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

export function normalizePathToKey(full_path: string): string {
  return normalizeFilename(basename(full_path));
}

// Folder prefix of a path, or '' for root-level objects.
export function folderOf(full_path: string): string {
  const i = full_path.lastIndexOf('/');
  return i >= 0 ? full_path.slice(0, i) : '';
}

// Mime + size sanity for the rejection step in the bucket inventory.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/avif']);

export function isAcceptableObject(args: { size_bytes: number; mime_type: string }): boolean {
  if (!args.size_bytes || args.size_bytes <= 0) return false;
  if (args.size_bytes > MAX_BYTES) return false;
  if (!ALLOWED_MIME.has(args.mime_type)) return false;
  return true;
}

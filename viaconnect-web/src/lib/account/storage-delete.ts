import type { AccountAdmin, QueryError, StorageListItem } from '@/lib/account/admin-port';
import { USER_STORAGE_BUCKETS } from '@/lib/account/storage-buckets';
import { withTimeout } from '@/lib/utils/with-timeout';

const LIST_PAGE = 1000;
const REMOVE_CHUNK = 100;
const TIMEOUT_MS = 8000;

export interface StorageFailure {
  ok: false;
  errorCode: 'storage_failed';
}

export interface StorageSuccess {
  ok: true;
  corpusHash: string | null;
}

function isBucketMissing(error: QueryError): boolean {
  return /bucket not found|does not exist/i.test(error.message);
}

function isFunctionMissing(error: QueryError): boolean {
  if (error.code === 'PGRST202') return true;
  return /could not find the function|function .* does not exist/i.test(error.message);
}

async function listPage(
  admin: AccountAdmin,
  bucket: string,
  prefix: string,
  offset: number,
): Promise<{ data: StorageListItem[] | null; error: QueryError | null }> {
  return withTimeout(
    admin.storage.from(bucket).list(prefix, { limit: LIST_PAGE, offset }),
    TIMEOUT_MS,
    'account.delete.storage.list',
  );
}

async function listFiles(admin: AccountAdmin, bucket: string, prefix: string): Promise<string[] | StorageFailure> {
  const files: string[] = [];
  let offset = 0;
  for (;;) {
    let page: { data: StorageListItem[] | null; error: QueryError | null };
    try {
      page = await listPage(admin, bucket, prefix, offset);
    } catch {
      return { ok: false, errorCode: 'storage_failed' };
    }
    if (page.error) {
      if (isBucketMissing(page.error)) return files;
      return { ok: false, errorCode: 'storage_failed' };
    }
    const items = page.data ?? [];
    for (const item of items) {
      if (!item.name || item.name === '.' || item.name === '..') continue;
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        const nested = await listFiles(admin, bucket, path);
        if (!Array.isArray(nested)) return nested;
        files.push(...nested);
      } else {
        files.push(path);
      }
    }
    if (items.length < LIST_PAGE) break;
    offset += items.length;
  }
  return files;
}

async function removeFiles(admin: AccountAdmin, bucket: string, paths: string[]): Promise<StorageFailure | null> {
  for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
    const chunk = paths.slice(i, i + REMOVE_CHUNK);
    if (chunk.length === 0) continue;
    try {
      const result = await withTimeout(
        admin.storage.from(bucket).remove(chunk),
        TIMEOUT_MS,
        'account.delete.storage.remove',
      );
      if (result.error && !isBucketMissing(result.error)) {
        return { ok: false, errorCode: 'storage_failed' };
      }
    } catch {
      return { ok: false, errorCode: 'storage_failed' };
    }
  }
  return null;
}

export async function resolveCorpusHash(admin: AccountAdmin, userId: string): Promise<
  { ok: true; hash: string | null } | StorageFailure
> {
  let result: { data: unknown; error: QueryError | null };
  try {
    result = await withTimeout(admin.rpc('get_corpus_salt'), TIMEOUT_MS, 'account.delete.corpus_salt');
  } catch {
    return { ok: false, errorCode: 'storage_failed' };
  }
  if (result.error) {
    if (isFunctionMissing(result.error)) return { ok: true, hash: null };
    return { ok: false, errorCode: 'storage_failed' };
  }
  if (typeof result.data !== 'string' || result.data.length === 0) {
    return { ok: true, hash: null };
  }
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(`${userId}${result.data}`).digest('hex');
  return { ok: true, hash };
}

export async function deleteUserStorage(
  admin: AccountAdmin,
  userId: string,
): Promise<StorageSuccess | StorageFailure> {
  const corpus = await resolveCorpusHash(admin, userId);
  if (!corpus.ok) return corpus;

  const jobs: { bucket: string; prefix: string }[] = USER_STORAGE_BUCKETS.map((bucket) => ({
    bucket,
    prefix: userId,
  }));
  if (corpus.hash) {
    jobs.push({ bucket: 'nutrivision-meals', prefix: corpus.hash });
  }

  for (const job of jobs) {
    const files = await listFiles(admin, job.bucket, job.prefix);
    if (!Array.isArray(files)) return files;
    const failed = await removeFiles(admin, job.bucket, files);
    if (failed) return failed;
  }

  return { ok: true, corpusHash: corpus.hash };
}

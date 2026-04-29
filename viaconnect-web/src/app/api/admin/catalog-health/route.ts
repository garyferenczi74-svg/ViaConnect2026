// Photo Sync prompt §3.7: catalog-health API.
//
// GET /api/admin/catalog-health
//   -> rows where products.image_url IS NULL OR points at a missing
//      object in the supplement-photos bucket. Used by the admin
//      surface to show the "needs upload" list.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PUBLIC_PREFIX, type ImageUrlClassification } from '@/lib/photoSync/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

interface ProfileLite { role: string }

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.catalog-health.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const profileRes = await withTimeout(
    (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
    5000,
    'api.catalog-health.load-profile',
  );
  if (!profileRes.data || profileRes.data.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { ok: true as const };
}

interface ProductLite {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  image_url: string | null;
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const auth = await requireAdmin(supabase);
    if (!auth.ok) return auth.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Pull the bucket contents once so we can flag stale URLs.
    const bucketPaths = new Set<string>();
    async function recurse(prefix: string): Promise<void> {
      const listRes = await withTimeout(
        (async () => sb.storage.from('supplement-photos').list(prefix, { limit: 1000 }))(),
        15000,
        'api.catalog-health.storage-list',
      );
      if (listRes.error) return;
      for (const obj of (listRes.data ?? []) as Array<{ id: string | null; name: string }>) {
        const isFolder = obj.id == null;
        const full = prefix ? `${prefix}/${obj.name}` : obj.name;
        if (isFolder) await recurse(full);
        else bucketPaths.add(full);
      }
    }
    await recurse('');

    const productsRes = await withTimeout(
      (async () => sb
        .from('product_catalog')
        .select('id, sku, name, category, image_url')
        .eq('active', true)
        .order('category', { nullsFirst: false })
        .order('sku'))(),
      15000,
      'api.catalog-health.list-products',
    );
    if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });

    const rows = (productsRes.data ?? []) as ProductLite[];
    const missingOrStale = rows
      .map((p) => {
        let cls: ImageUrlClassification;
        if (p.image_url == null || p.image_url.trim() === '') cls = 'NULL';
        else if (p.image_url.startsWith(PUBLIC_PREFIX)) {
          const path = p.image_url.slice(PUBLIC_PREFIX.length);
          cls = bucketPaths.has(path) ? 'VALID_SUPABASE' : 'STALE_SUPABASE';
        } else if (/\/(placeholder|default|coming[-_]?soon|images\/fallback)\b/i.test(p.image_url)) cls = 'PLACEHOLDER';
        else cls = 'EXTERNAL';
        return { ...p, classification: cls };
      })
      .filter((p) => p.classification === 'NULL' || p.classification === 'STALE_SUPABASE' || p.classification === 'PLACEHOLDER');

    return NextResponse.json({
      rows: missingOrStale,
      bucket_dashboard_url: 'https://supabase.com/dashboard/project/nnhkcufyqjojdbvdrpky/storage/files/buckets/supplement-photos',
      counts: {
        total_active_products: rows.length,
        missing_or_stale: missingOrStale.length,
      },
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.catalog-health', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.catalog-health', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

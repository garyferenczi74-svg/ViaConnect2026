// Prompt #106 §4.4 — admin batch-upload API.
//
// POST multipart/form-data:
//   - file: the image (required)
//   - object_path: canonical path {category_slug}/{sku_slug}.png (required)
//
// Pipeline:
//   1. requireShopAdmin.
//   2. parseCanonicalObjectPath — reject if path violates §4.2.
//   3. sharp pipeline — rotate() + re-encode drops EXIF/XMP/IPTC/ICC;
//      validates dims [800..4000] and byte-size ≤ 2 MB post-sanitize.
//   4. assertBucketIsCanonical (defense-in-depth runtime guard).
//   5. Compute SHA-256 of the sanitized bytes.
//   6. Upload to supplement-photos (upsert: false — never overwrite a
//      different SHA silently; callers use a versioned path for swaps).
//   7. Upsert supplement_photo_inventory row.
//   8. Audit.
//
// Returns { inventory_id, object_path, sha256, byte_size, width, height }.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireShopAdmin } from '@/lib/shopRefresh/admin-guard';
import { parseCanonicalObjectPath } from '@/lib/shopRefresh/upload/canonicalNaming';
import { sanitizeImage } from '@/lib/shopRefresh/upload/sharpSanitizer';
import { assertBucketIsCanonical } from '@/lib/shopRefresh/scopeGuards';
import { CANONICAL_BUCKET } from '@/lib/shopRefresh/types';
import { writeShopRefreshAuditLog, SHOP_REFRESH_AUDIT_VERBS } from '@/lib/shopRefresh/approval/auditLogger';
import { sha256Hex } from '@/lib/legal/evidence/hashing';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireShopAdmin();
  if (auth.kind === 'error') return auth.response;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 });

  const file = form.get('file');
  const objectPathRaw = form.get('object_path');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (typeof objectPathRaw !== 'string') return NextResponse.json({ error: 'object_path required' }, { status: 400 });

  const parsed = parseCanonicalObjectPath(objectPathRaw);
  if (!parsed.ok) return NextResponse.json({ error: 'CANONICAL_NAMING_VIOLATED', detail: parsed.reason }, { status: 422 });

  // sharp — strip EXIF + validate dims + cap byte size.
  let sanitized;
  try {
    const arr = await file.arrayBuffer();
    sanitized = await sanitizeImage(arr);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'sanitize failed';
    return NextResponse.json({ error: 'IMAGE_VALIDATION_FAILED', detail: msg }, { status: 422 });
  }

  // Cross-check content type vs. file extension parsed.
  const expectedExt = parsed.parsed.extension === 'png' ? 'png' : 'jpeg';
  if (sanitized.format !== expectedExt) {
    return NextResponse.json({
      error: 'FORMAT_MISMATCH',
      detail: `filename suggests ${expectedExt} but image bytes are ${sanitized.format}`,
    }, { status: 422 });
  }

  assertBucketIsCanonical(CANONICAL_BUCKET);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const sha = await sha256Hex(sanitized.bytes);

  // Upload. upsert:false protects against silent overwrites of a different
  // object — the admin uses a versioned -v{N}.png path for replacement.
  const { error: upErr } = await admin.storage
    .from(CANONICAL_BUCKET)
    .upload(objectPathRaw, sanitized.bytes, {
      contentType: sanitized.format === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    });
  if (upErr) {
    // Specific handling: a duplicate at the same path with a different
    // SHA would trigger a 409. The admin should bump -v{N} and retry.
    const msg = upErr.message ?? 'upload failed';
    const status = /Duplicate|already exists/i.test(msg) ? 409 : 500;
    return NextResponse.json({ error: 'STORAGE_UPLOAD_FAILED', detail: msg }, { status });
  }

  const { data: invRow, error: invErr } = await admin
    .from('supplement_photo_inventory')
    .upsert({
      bucket_name: CANONICAL_BUCKET,
      object_path: objectPathRaw,
      content_type: sanitized.format === 'png' ? 'image/png' : 'image/jpeg',
      byte_size: sanitized.byteSize,
      sha256_hash: sha,
      last_modified_at: new Date().toISOString(),
      scope: 'in_scope',
      deleted_at: null,
      last_verified_at: new Date().toISOString(),
    }, { onConflict: 'bucket_name,object_path' })
    .select('inventory_id')
    .single();
  if (invErr || !invRow) {
    // Best-effort cleanup of the just-uploaded object so metadata + bytes
    // never diverge. Same pattern as the #105 render route.
    await admin.storage.from(CANONICAL_BUCKET).remove([objectPathRaw]).catch(() => {});
    return NextResponse.json({ error: 'INVENTORY_UPSERT_FAILED', detail: invErr?.message }, { status: 500 });
  }

  await writeShopRefreshAuditLog(admin, {
    actionCategory: 'storage_upload',
    actionVerb: SHOP_REFRESH_AUDIT_VERBS.STORAGE_UPLOAD,
    targetTable: 'supplement_photo_inventory',
    targetId: invRow.inventory_id,
    actorUserId: auth.userId,
    actorRole: 'admin',
    afterStateJson: {
      object_path: objectPathRaw,
      sha256: sha,
      byte_size: sanitized.byteSize,
      width: sanitized.width,
      height: sanitized.height,
      format: sanitized.format,
      version: parsed.parsed.version,
    },
  });

  return NextResponse.json({
    inventory_id: invRow.inventory_id,
    object_path: objectPathRaw,
    sha256: sha,
    byte_size: sanitized.byteSize,
    width: sanitized.width,
    height: sanitized.height,
    format: sanitized.format,
    version: parsed.parsed.version,
  });
}

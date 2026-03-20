import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin, getUserId } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

const InputSchema = z.object({
  userId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  format: z.enum(['json', 'pdf']).default('json'),
});

// ── AES-256-GCM encryption ──────────────────────────────────────────────
async function encryptData(
  data: Uint8Array,
): Promise<{ encrypted: Uint8Array; iv: Uint8Array; key: CryptoKey }> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );
  return { encrypted: new Uint8Array(encrypted), iv, key };
}

// ── Compute SHA-256 hash for audit trail ─────────────────────────────────
async function computeHash(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const requesterId = await getUserId(req);
    if (!requesterId) return err('Unauthorized', 'AUTH_REQUIRED', 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { userId, requestedBy, format } = parsed.data;
    const admin = getSupabaseAdmin();

    // Verify requester has access (self or practitioner/admin)
    if (requesterId !== userId) {
      const { data: requesterProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', requesterId)
        .single();

      if (
        !requesterProfile ||
        !['practitioner', 'admin'].includes(requesterProfile.role)
      ) {
        return err(
          'Insufficient permissions to export this patient data',
          'FORBIDDEN',
          403,
        );
      }
    }

    // Collect all patient data across tables
    const [
      profileRes,
      geneticRes,
      variantsRes,
      assessmentRes,
      metricsRes,
      scoresRes,
      tasksRes,
      tokensRes,
      transactionsRes,
      ordersRes,
      membershipRes,
      kitsRes,
      insightsRes,
      streaksRes,
      tiersRes,
      logsRes,
      recommendationsRes,
    ] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).single(),
      admin.from('genetic_profiles').select('*').eq('user_id', userId),
      admin.from('genetic_variants').select('*').eq('user_id', userId),
      admin.from('clinical_assessments').select('*').eq('user_id', userId),
      admin.from('health_metrics').select('*').eq('user_id', userId),
      admin.from('health_scores').select('*').eq('user_id', userId),
      admin.from('daily_tasks').select('*').eq('user_id', userId),
      admin.from('farma_tokens').select('*').eq('user_id', userId),
      admin.from('token_transactions').select('*').eq('user_id', userId),
      admin.from('orders').select('*, order_items(*)').eq('user_id', userId),
      admin.from('memberships').select('*').eq('user_id', userId),
      admin.from('kit_registrations').select('*').eq('user_id', userId),
      admin.from('ai_insights').select('*').eq('user_id', userId),
      admin.from('user_streaks').select('*').eq('user_id', userId),
      admin.from('user_tiers').select('*').eq('user_id', userId),
      admin.from('supplement_logs').select('*').eq('user_id', userId),
      admin.from('recommendations').select('*').eq('user_id', userId),
    ]);

    const exportData = {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        requestedBy,
        format,
        dataSubjectId: userId,
        purpose: 'Patient data export per HIPAA Right of Access',
      },
      profile: profileRes.data,
      geneticProfiles: geneticRes.data ?? [],
      geneticVariants: variantsRes.data ?? [],
      clinicalAssessments: assessmentRes.data ?? [],
      healthMetrics: metricsRes.data ?? [],
      healthScores: scoresRes.data ?? [],
      dailyTasks: tasksRes.data ?? [],
      viaTokens: tokensRes.data ?? [],
      tokenTransactions: transactionsRes.data ?? [],
      orders: ordersRes.data ?? [],
      memberships: membershipRes.data ?? [],
      kitRegistrations: kitsRes.data ?? [],
      aiInsights: insightsRes.data ?? [],
      streaks: streaksRes.data ?? [],
      tiers: tiersRes.data ?? [],
      supplementLogs: logsRes.data ?? [],
      recommendations: recommendationsRes.data ?? [],
    };

    // Serialize the data
    let fileContent: Uint8Array;
    let fileName: string;
    let contentType: string;

    if (format === 'json') {
      const jsonStr = JSON.stringify(exportData, null, 2);
      fileContent = new TextEncoder().encode(jsonStr);
      fileName = `patient-export-${userId}-${Date.now()}.json`;
      contentType = 'application/json';
    } else {
      // PDF format: generate a simple text-based PDF
      // In production, use a PDF library; here we export structured text
      const pdfContent = generateTextPdf(exportData);
      fileContent = new TextEncoder().encode(pdfContent);
      fileName = `patient-export-${userId}-${Date.now()}.txt`;
      contentType = 'text/plain';
    }

    // Compute hash before encryption for audit trail
    const dataHash = await computeHash(fileContent);

    // Encrypt with AES-256-GCM
    const { encrypted, iv, key } = await encryptData(fileContent);

    // Export key as raw bytes for the download link
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const keyHex = [...new Uint8Array(rawKey)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv, 0);
    combined.set(encrypted, iv.length);

    // Upload encrypted file to Supabase Storage
    const storagePath = `exports/${userId}/${fileName}.enc`;
    const { error: uploadErr } = await admin.storage
      .from('patient-exports')
      .upload(storagePath, combined, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadErr) {
      // If bucket doesn't exist, try creating it
      if (uploadErr.message?.includes('Bucket not found')) {
        await admin.storage.createBucket('patient-exports', {
          public: false,
        });
        await admin.storage
          .from('patient-exports')
          .upload(storagePath, combined, {
            contentType: 'application/octet-stream',
            upsert: true,
          });
      } else {
        return err(
          `Storage upload failed: ${uploadErr.message}`,
          'STORAGE_ERROR',
          500,
        );
      }
    }

    // Generate 24-hour signed URL
    const { data: signedUrl } = await admin.storage
      .from('patient-exports')
      .createSignedUrl(storagePath, 86400); // 24 hours

    // Write HIPAA-compliant audit entry
    await writeAudit({
      userId: requestedBy,
      action: 'export_patient_data',
      tableName: 'profiles',
      recordId: userId,
      newData: {
        format,
        fileName,
        fileHash: dataHash,
        encryptionAlgorithm: 'AES-256-GCM',
        storagePath,
        expiresIn: '24 hours',
        tablesExported: [
          'profiles',
          'genetic_profiles',
          'genetic_variants',
          'clinical_assessments',
          'health_metrics',
          'health_scores',
          'daily_tasks',
          'farma_tokens',
          'token_transactions',
          'orders',
          'memberships',
          'kit_registrations',
          'ai_insights',
          'user_streaks',
          'user_tiers',
          'supplement_logs',
          'recommendations',
        ],
        recordCounts: {
          geneticProfiles: (geneticRes.data ?? []).length,
          geneticVariants: (variantsRes.data ?? []).length,
          assessments: (assessmentRes.data ?? []).length,
          healthMetrics: (metricsRes.data ?? []).length,
          orders: (ordersRes.data ?? []).length,
          supplementLogs: (logsRes.data ?? []).length,
          recommendations: (recommendationsRes.data ?? []).length,
        },
      },
    });

    return ok({
      downloadUrl: signedUrl?.signedUrl ?? null,
      decryptionKey: keyHex,
      fileHash: dataHash,
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      format,
      fileName,
      encryptionAlgorithm: 'AES-256-GCM',
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});

function generateTextPdf(data: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push('VIACONNECT GENEX360 — PATIENT DATA EXPORT');
  lines.push('FarmCeutica Wellness LLC — Buffalo, NY');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Export Date: ${new Date().toISOString()}`);
  lines.push(`Subject ID: ${(data.exportMetadata as Record<string, string>)?.dataSubjectId}`);
  lines.push('');

  for (const [section, content] of Object.entries(data)) {
    if (section === 'exportMetadata') continue;
    lines.push('-'.repeat(40));
    lines.push(section.toUpperCase());
    lines.push('-'.repeat(40));
    lines.push(JSON.stringify(content, null, 2));
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push('END OF EXPORT');
  lines.push('This document is protected under HIPAA.');
  lines.push('Unauthorized disclosure is prohibited.');
  lines.push('='.repeat(60));
  return lines.join('\n');
}

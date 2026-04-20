// =============================================================================
// brand_compliance_validator Edge Function
// =============================================================================
// Prompt #103 Phase 3: Claude Vision-backed packaging proof validator.
//
// Contract:
//   POST { productId: string }
//   -> downloads the products.packaging_proof_path image from Supabase
//      Storage, loads the product + brand + category + certifications,
//      builds a category-aware validation prompt, calls claude-opus-4-7
//      with the image + prompt, parses the strict-JSON response,
//      classifies overall severity, inserts a brand_compliance_reviews
//      row, and updates products.brand_compliance_status.
//
// Heartbeats to ultrathink_agent_registry so Jeffery can monitor.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY   = Deno.env.get('ANTHROPIC_API_KEY')!;
const PROOF_BUCKET    = 'packaging-proofs';

// Inline copies of the pure helpers from src/lib/brandCompliance/
// (Deno edge runtime does not resolve the @/lib alias).

const COMPLIANCE_ISSUE_CODES = [
  'wrong_wordmark','missing_tagline','wrong_tagline','palette_mismatch',
  'wrong_identity_mark','missing_identity_mark','missing_tm_symbol',
  'methylated_on_non_base_or_childrens','dual_delivery_on_base_or_childrens',
  'capacity_or_dose_mismatch','capacity_or_dose_typo',
  'missing_certification_badge','prohibited_emoji','prohibited_dna_helix',
  'prohibited_precision_circle','cross_category_palette_leak','unsubstantiated_claim',
  'viacura_wordmark_on_sproutables','sproutables_wordmark_on_viacura','snp_tagline_on_non_snp',
];

const CRITICAL_ISSUE_CODES = new Set([
  'cross_category_palette_leak','viacura_wordmark_on_sproutables',
  'sproutables_wordmark_on_viacura','snp_tagline_on_non_snp','capacity_or_dose_mismatch',
]);
const MAJOR_ISSUE_CODES = new Set([
  'wrong_wordmark','wrong_tagline','palette_mismatch','wrong_identity_mark',
  'missing_identity_mark','missing_tm_symbol','methylated_on_non_base_or_childrens',
  'dual_delivery_on_base_or_childrens','prohibited_emoji','prohibited_dna_helix',
  'prohibited_precision_circle',
]);

function classifyOverallSeverity(issues: Array<{ code: string; severity: string }>): string {
  if (issues.length === 0) return 'clean';
  let worst = 'minor';
  for (const i of issues) {
    if (i.severity === 'critical') return 'critical';
    if (i.severity === 'major') worst = 'major';
  }
  return worst;
}

function identityMarkDescription(slug: string): string {
  if (slug === 'base_formulas' || slug === 'childrens_methylated') {
    return 'Methylated Formula badge (7-dot hexagonal molecular mark) MUST be present. Dual Delivery Technology two-circle mark MUST NOT be present.';
  }
  if (slug === 'advanced_formulas' || slug === 'womens_health' || slug === 'snp_support' || slug === 'functional_mushrooms') {
    return 'Dual Delivery Technology™ two-circle mark MUST be present with the ™ symbol. Methylated Formula badge MUST NOT be present.';
  }
  if (slug === 'genex360_testing') {
    return 'Neither Methylated Formula badge NOR Dual Delivery Technology mark should appear; this is a test kit, not a supplement.';
  }
  return 'Category rules unknown.';
}

function expectedTaglineForBrandSlug(slug: string): string {
  if (slug === 'sproutables') return 'Peak Growth and Wellness';
  if (slug === 'viacura-snp') return 'Your Genetics | Your Protocol';
  return 'Built For Your Biology';
}

function buildValidationPrompt(input: {
  product: { name: string; serving_count: number | null; serving_unit: string | null; dose_per_serving_text: string | null; sku_bottle_color_primary_hex: string | null; sku_typography_primary_hex: string | null };
  brand: { brand_slug: string; display_name: string; wordmark_style: string };
  category: { category_slug: string; display_name: string; palette_rule: string; bottle_color_primary_hex: string | null; typography_primary_hex: string | null; accent_color_hex: string | null };
  certificationSlugs: string[];
}): string {
  const expectedTagline = expectedTaglineForBrandSlug(input.brand.brand_slug);
  const paletteExp =
    input.category.palette_rule === 'single_palette_category_wide'
      ? `Dominant bottle color should match ${input.category.bottle_color_primary_hex ?? '(unset)'}. Primary typography color should match ${input.category.typography_primary_hex ?? '(unset)'}. Accent color should match ${input.category.accent_color_hex ?? '(unset)'}.`
      : input.category.palette_rule === 'per_sku_palette'
        ? `Per-SKU palette: bottle ${input.product.sku_bottle_color_primary_hex ?? '(unset)'}, typography primary ${input.product.sku_typography_primary_hex ?? '(unset)'}. Palette does NOT need to match the category default.`
        : 'Not applicable (test kit format).';

  const wordmarkRule =
    input.brand.brand_slug === 'sproutables'
      ? '- Sproutables packaging MUST NOT render the VIACURA wordmark anywhere.'
      : input.brand.brand_slug === 'viacura-snp'
        ? '- SNP Line uses monochrome VIACURA wordmark (gold on matte black).'
        : '- ViaCura uses the bi-tonal VIA / CURA wordmark.';

  return [
    'You are the ViaCura / Sproutables Brand Identity Compliance reviewer.',
    'Audit the attached packaging proof image and return JSON only.',
    '',
    '## Product context',
    `- Name: ${input.product.name}`,
    `- Brand: ${input.brand.display_name} (wordmark style: ${input.brand.wordmark_style})`,
    `- Category: ${input.category.display_name} (slug: ${input.category.category_slug})`,
    `- Expected tagline (exact): "${expectedTagline}"`,
    `- Serving: ${input.product.serving_count ?? '?'} ${input.product.serving_unit ?? '?'}`,
    `- Dose: ${input.product.dose_per_serving_text ?? '(unset)'}`,
    `- Certifications: ${input.certificationSlugs.join(', ') || 'none'}`,
    '',
    '## Identity-mark rule',
    identityMarkDescription(input.category.category_slug),
    '',
    '## Palette rule',
    paletteExp,
    '',
    '## Wordmark rule',
    wordmarkRule,
    '',
    '## Prohibited',
    '- No emojis. No DNA helix icons. No circular "Precision" badges.',
    '- No unsubstantiated claims (Revolutionary, Miraculous, Cures, etc.).',
    '',
    '## Output',
    'Single JSON object: { "issues": [ { "code": "<enum>", "severity": "minor|major|critical", "message": "<short>", "bbox": {"x":0,"y":0,"w":0,"h":0} } ] }.',
    `Valid codes: ${COMPLIANCE_ISSUE_CODES.join(', ')}.`,
    'If fully compliant: { "issues": [] }. No text outside the JSON.',
  ].join('\n');
}

async function heartbeat(db: ReturnType<typeof createClient>, run_id: string, event_type: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await (db as any).rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'brand_compliance_validator',
      p_run_id: run_id,
      p_event_type: event_type,
      p_payload: payload,
      p_severity: 'info',
    });
  } catch {
    // non-fatal: heartbeat must never break the primary path
  }
}

serve(async (req) => {
  const runId = crypto.randomUUID();
  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as any;

  try {
    const { productId } = await req.json();
    if (!productId || typeof productId !== 'string') {
      return new Response(JSON.stringify({ error: 'productId required' }), { status: 400 });
    }

    await heartbeat(db, runId, 'start', { productId });

    // Load product + brand + category + certifications.
    const { data: product, error: pErr } = await db
      .from('products')
      .select('id, name, packaging_proof_path, brand_id, product_category_id, serving_count, serving_unit, dose_per_serving_text, sku_bottle_color_primary_hex, sku_typography_primary_hex')
      .eq('id', productId)
      .maybeSingle();
    if (pErr || !product) {
      return new Response(JSON.stringify({ error: 'product not found' }), { status: 404 });
    }
    if (!product.packaging_proof_path) {
      return new Response(JSON.stringify({ error: 'packaging_proof_path not set on product' }), { status: 400 });
    }

    const { data: brand } = await db.from('brands')
      .select('brand_slug, display_name, wordmark_style, master_tagline')
      .eq('brand_id', product.brand_id).maybeSingle();
    const { data: category } = await db.from('product_categories')
      .select('category_slug, display_name, identity_mark_type, palette_rule, bottle_color_primary_hex, typography_primary_hex, accent_color_hex, tagline_primary')
      .eq('product_category_id', product.product_category_id).maybeSingle();
    const { data: certRows } = await db
      .from('product_certification_assignments')
      .select('product_certifications ( certification_slug )')
      .eq('product_id', productId);
    const certificationSlugs = (certRows ?? [])
      .map((r: any) => r.product_certifications?.certification_slug)
      .filter(Boolean);

    if (!brand || !category) {
      return new Response(JSON.stringify({ error: 'product missing brand or category assignment' }), { status: 400 });
    }

    // Download proof image -> base64.
    const { data: imageBlob, error: dlErr } = await db.storage
      .from(PROOF_BUCKET)
      .download(product.packaging_proof_path);
    if (dlErr || !imageBlob) {
      return new Response(JSON.stringify({ error: 'failed to download packaging proof' }), { status: 500 });
    }
    const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());
    let binary = '';
    for (const b of imageBuffer) binary += String.fromCharCode(b);
    const imageBase64 = btoa(binary);
    const mediaType = product.packaging_proof_path.toLowerCase().endsWith('.jpg') ||
                      product.packaging_proof_path.toLowerCase().endsWith('.jpeg')
                        ? 'image/jpeg' : 'image/png';

    // Call Claude Vision.
    const validationPrompt = buildValidationPrompt({ product, brand, category, certificationSlugs });

    const vResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: validationPrompt },
          ],
        }],
      }),
    });
    const visionResult = await vResp.json();

    // Extract the strict-JSON response from the first text block.
    let parsed: { issues: Array<{ code: string; severity: string; message: string; bbox?: unknown }> } = { issues: [] };
    try {
      const textBlock = (visionResult?.content ?? []).find((b: any) => b.type === 'text')?.text ?? '';
      const jsonStart = textBlock.indexOf('{');
      const jsonEnd   = textBlock.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        parsed = JSON.parse(textBlock.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      parsed = { issues: [] };
    }

    // Normalise each issue severity using the authoritative classifier,
    // regardless of what the model wrote (the model occasionally flips).
    const normalizedIssues = (parsed.issues ?? []).map((i) => ({
      ...i,
      severity: CRITICAL_ISSUE_CODES.has(i.code)
        ? 'critical'
        : MAJOR_ISSUE_CODES.has(i.code)
          ? 'major'
          : 'minor',
    }));

    const severity = classifyOverallSeverity(normalizedIssues);
    const status =
      severity === 'clean'    ? 'approved'    :
      severity === 'critical' ? 'rejected'    :
                                'pending_human_review';

    const { data: review, error: rErr } = await db
      .from('brand_compliance_reviews')
      .insert({
        product_id: productId,
        packaging_proof_path: product.packaging_proof_path,
        vision_analysis_json: visionResult,
        detected_issues_json: normalizedIssues,
        severity,
        status,
      })
      .select('review_id')
      .maybeSingle();
    if (rErr) {
      await heartbeat(db, runId, 'error', { stage: 'insert_review', message: rErr.message });
      return new Response(JSON.stringify({ error: rErr.message }), { status: 500 });
    }

    const productStatus =
      status === 'approved' ? 'approved' :
      status === 'rejected' ? 'rejected' :
                              'flagged';
    const productUpdate: Record<string, unknown> = {
      brand_compliance_status: productStatus,
      updated_at: new Date().toISOString(),
    };
    if (status === 'approved') {
      productUpdate.brand_compliance_reviewed_at = new Date().toISOString();
    }
    await db.from('products').update(productUpdate).eq('id', productId);

    await heartbeat(db, runId, 'done', { productId, severity, issueCount: normalizedIssues.length });

    return new Response(
      JSON.stringify({ reviewId: review?.review_id, severity, status, issueCount: normalizedIssues.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = (e as Error).message;
    await heartbeat(db, runId, 'error', { message: msg });
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});

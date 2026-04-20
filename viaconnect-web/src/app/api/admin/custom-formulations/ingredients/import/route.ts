// Prompt #97 Phase 2.4: ingredient CSV import endpoint.
// POST multipart/form-data OR application/json { csv: '...' }
// Admin-only. Runs pure parseIngredientCsv + inserts valid rows with
// is_available_for_custom_formulation = false so each row requires a
// manual review toggle before it appears in the formulation builder.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCustomFormulationsAdmin } from '@/lib/custom-formulations/admin-guard';
import { parseIngredientCsv } from '@/lib/custom-formulations/ingredient-csv';

export async function POST(request: NextRequest) {
  const auth = await requireCustomFormulationsAdmin();
  if (auth.kind === 'error') return auth.response;

  let csv: string;
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as { csv?: string } | null;
    if (!body?.csv) {
      return NextResponse.json({ error: 'JSON body must include `csv` field' }, { status: 400 });
    }
    csv = body.csv;
  } else if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'multipart body must include a `file`' }, { status: 400 });
    }
    csv = await file.text();
  } else {
    return NextResponse.json(
      { error: 'Unsupported content-type; use application/json or multipart/form-data' },
      { status: 415 },
    );
  }

  const parsed = parseIngredientCsv(csv);

  if (parsed.valid.length === 0) {
    return NextResponse.json(
      {
        error: 'No valid rows found',
        invalid_count: parsed.invalid.length,
        invalid_samples: parsed.invalid.slice(0, 5),
      },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const rows = parsed.valid.map((r) => ({
    ...r,
    added_by: auth.userId,
  }));

  const { error, count } = await supabase
    .from('ingredient_library')
    .insert(rows as never, { count: 'exact' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    imported: count ?? 0,
    invalid_count: parsed.invalid.length,
    invalid_samples: parsed.invalid.slice(0, 20),
  });
}

// Prompt 170r: publish educational cards from markdown.
// Usage:
//   npx tsx scripts/content/publish-cards-from-markdown.ts
//   npx tsx scripts/content/publish-cards-from-markdown.ts --dry-run
//   npx tsx scripts/content/publish-cards-from-markdown.ts --apply
//
// Default is dry-run (no database writes). --apply upserts drafts, then
// marks content_cards published only when the linter passes and approval
// rules hold. Deterministic. Zero runtime LLM. Does not print secrets.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  loadEducationalCards,
  resolveEducationalCardsRoot,
} from '../../src/lib/content/authoring-pipeline/card-reader';
import { lintEducationalCard } from '../../src/lib/content/authoring-pipeline/internal-linter';
import {
  buildContentCardRow,
  decidePublish,
} from '../../src/lib/content/authoring-pipeline/publish-plan';
import { validateCardFrontmatter } from '../../src/lib/content/authoring-pipeline/validate-frontmatter';
import type { ParsedCard } from '../../src/lib/content/authoring-pipeline/types';

interface QueryError {
  message: string;
}

interface ServiceClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null;
          error: QueryError | null;
        }>;
      };
    };
    insert: (payload: Record<string, unknown>) => Promise<{ error: QueryError | null }>;
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: QueryError | null }>;
    };
    upsert: (
      payload: Record<string, unknown>,
      options: { onConflict: string },
    ) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: { id: string; slug: string } | null;
          error: QueryError | null;
        }>;
      };
    };
  };
}

interface Flags {
  apply: boolean;
  root: string;
}

function parseFlags(argv: readonly string[]): Flags {
  const flags: Flags = {
    apply: false,
    root: resolveEducationalCardsRoot(),
  };
  for (const arg of argv) {
    if (arg === '--apply') flags.apply = true;
    else if (arg === '--dry-run') flags.apply = false;
    else if (arg.startsWith('--root=')) flags.root = arg.slice('--root='.length);
  }
  return flags;
}

function loadEnvLocal(): void {
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'viaconnect-web/.env.local'),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

async function createServiceClient(): Promise<ServiceClient> {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    process.stderr.write(
      'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Dry-run does not need credentials. --apply does.\n',
    );
    process.exit(2);
  }
  const supabase = await import('@supabase/supabase-js');
  return supabase.createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as ServiceClient;
}

async function upsertDraft(
  db: ServiceClient,
  card: ParsedCard,
  draftState: string,
  linterResults: unknown,
  sourceCardId: string | null,
): Promise<void> {
  const payload = {
    source_card_id: sourceCardId,
    draft_slug: card.frontmatter.slug,
    draft_title: card.title,
    draft_body_markdown: card.body,
    draft_metadata_jsonb: {
      relative_path: card.relativePath,
      frontmatter: card.frontmatter,
      authored_safety_mode_filter: card.frontmatter.safety_mode_filter,
      secondary_tags: card.frontmatter.secondary_tags,
      related_slugs: card.relatedSlugs,
    },
    draft_state: draftState,
    linter_check_results_jsonb: linterResults,
  };

  const { data: existing, error: selectError } = await db
    .from('content_card_drafts')
    .select('id')
    .eq('draft_slug', card.frontmatter.slug)
    .maybeSingle();
  if (selectError) {
    throw new Error(`draft select failed for ${card.frontmatter.slug}: ${selectError.message}`);
  }

  const existingId = typeof existing?.id === 'string' ? existing.id : null;
  if (existingId) {
    const { error } = await db
      .from('content_card_drafts')
      .update(payload)
      .eq('id', existingId);
    if (error) {
      throw new Error(`draft update failed for ${card.frontmatter.slug}: ${error.message}`);
    }
    return;
  }

  const { error } = await db.from('content_card_drafts').insert(payload);
  if (error) {
    throw new Error(`draft insert failed for ${card.frontmatter.slug}: ${error.message}`);
  }
}

async function applyCards(
  db: ServiceClient,
  prepared: Array<{
    card: ParsedCard;
    decision: ReturnType<typeof decidePublish>;
    lint: ReturnType<typeof lintEducationalCard>;
  }>,
): Promise<void> {
  const slugToId = new Map<string, string>();

  for (const item of prepared) {
    const row = buildContentCardRow(item.card, item.decision);
    const { data: existing, error: existingError } = await db
      .from('content_cards')
      .select('id, version, published_at, body_markdown')
      .eq('slug', row.slug)
      .maybeSingle();
    if (existingError) {
      throw new Error(`card select failed for ${row.slug}: ${existingError.message}`);
    }

    const nextVersion =
      existing && existing.body_markdown !== row.body_markdown
        ? Number(existing.version ?? 1) + 1
        : Number(existing?.version ?? 1);
    const publishedAt =
      row.is_published
        ? (existing?.published_at as string | null) ?? row.published_at
        : null;

    const { data: upserted, error } = await db
      .from('content_cards')
      .upsert(
        {
          ...row,
          version: nextVersion,
          published_at: publishedAt,
        },
        { onConflict: 'slug' },
      )
      .select('id, slug')
      .single();
    if (error || !upserted) {
      throw new Error(`card upsert failed for ${row.slug}: ${error?.message ?? 'no row'}`);
    }
    slugToId.set(upserted.slug, upserted.id);

    await upsertDraft(
      db,
      item.card,
      item.decision.draftState,
      {
        ok: item.lint.ok,
        findings: item.lint.findings,
        mark_published: item.decision.markPublished,
        reasons: item.decision.reasons,
      },
      upserted.id,
    );
  }

  for (const item of prepared) {
    const relatedIds = item.card.relatedSlugs
      .map((slug) => slugToId.get(slug))
      .filter((id): id is string => Boolean(id));
    const cardId = slugToId.get(item.card.frontmatter.slug);
    if (!cardId) continue;
    const { error } = await db
      .from('content_cards')
      .update({ related_card_ids: relatedIds })
      .eq('id', cardId);
    if (error) {
      throw new Error(`related_card_ids update failed for ${item.card.frontmatter.slug}: ${error.message}`);
    }
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const cards = loadEducationalCards(flags.root);
  const prepared = cards.map((card) => {
    const validation = validateCardFrontmatter(card);
    const lint = lintEducationalCard(card);
    const decision = decidePublish({ card, validation, lint });
    return { card, validation, lint, decision };
  });

  process.stdout.write('Via Cura educational card publisher\n');
  process.stdout.write(`root: ${flags.root}\n`);
  process.stdout.write(`mode: ${flags.apply ? 'apply' : 'dry-run'}\n`);
  process.stdout.write(`cards: ${prepared.length}\n\n`);

  let publishable = 0;
  let blocked = 0;
  for (const item of prepared) {
    const action = item.decision.markPublished ? 'DRAFT+PUBLISH' : 'DRAFT-ONLY   ';
    if (item.decision.markPublished) publishable += 1;
    else blocked += 1;
    const reason =
      item.decision.reasons.length > 0
        ? `  (${item.decision.reasons.join('; ')})`
        : '';
    process.stdout.write(
      `${action}  ${item.card.frontmatter.slug}  caution=${item.card.frontmatter.medical_caution_level}  gary_approved_at=${item.card.frontmatter.gary_approved_at ?? 'none'}${reason}\n`,
    );
    if (!item.validation.ok) {
      for (const issue of item.validation.issues) {
        process.stdout.write(`     frontmatter ${issue.field}: ${issue.message}\n`);
      }
    }
    if (!item.lint.ok) {
      for (const finding of item.lint.findings) {
        process.stdout.write(`     lint [${finding.code}] ${finding.message}\n`);
      }
    }
  }

  process.stdout.write(
    `\n${prepared.length} drafts, ${publishable} can publish, ${blocked} stay unpublished\n`,
  );

  if (!flags.apply) {
    process.stdout.write('Dry-run: no database writes.\n');
    const hardFail = prepared.some((item) => !item.validation.ok || !item.lint.ok);
    process.exit(hardFail ? 1 : 0);
    return;
  }

  loadEnvLocal();
  const db = await createServiceClient();
  await applyCards(db, prepared);
  process.stdout.write('Apply complete: drafts upserted; publish flags written.\n');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

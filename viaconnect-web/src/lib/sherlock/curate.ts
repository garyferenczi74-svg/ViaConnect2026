/**
 * Prompt 214b: Sherlock curation from gated Hound Dog items.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import { safeLog } from '@/lib/utils/safe-log';

export interface CurationOutput {
  curationKey: string;
  title: string;
  summary: string;
  qualityGrade: string;
  isUpgrade: boolean;
  routeTags: string[];
  sourceUrl: string;
  provenance: Array<{ url: string; gatedId?: string }>;
  supersedesKey?: string;
}

function gradeFromText(summary: string, hasFullText: boolean): string {
  if (hasFullText && /randomized|double[- ]blind|meta-analysis/i.test(summary)) return 'high';
  if (/clinical trial|cohort|case[- ]control/i.test(summary)) return 'medium';
  if (/blog|forum|discussion/i.test(summary)) return 'low';
  return 'unknown';
}

function routeTagsFor(topicKey: string | null, title: string, summary: string): string[] {
  const tags = new Set<string>();
  const blob = `${topicKey ?? ''} ${title} ${summary}`.toLowerCase();
  if (/nad|mitochond|coq10|longevity|sleep|circadian|body composition|muscle|fat/.test(blob)) {
    tags.add('arnold');
  }
  if (/nutrition|omega|vitamin|hydrat|meal|diet|protein|calorie/.test(blob)) {
    tags.add('gordon');
  }
  if (/mthfr|comt|gene|snp|genome|allele/.test(blob)) {
    tags.add('arnold');
    tags.add('hannah');
  }
  tags.add('hannah'); // all curated items may inform insights
  return [...tags];
}

export async function runSherlockCuration(limit = 30): Promise<{
  curated: number;
  upgrades: number;
  items: CurationOutput[];
}> {
  const supabase = createAdminClient();
  const { data: gated } = await supabase
    .from('hounddog_gated_items')
    .select('id, staging_id, title, summary, source_url, source_type, approved_at')
    .order('approved_at', { ascending: false })
    .limit(limit);

  const rows = Array.isArray(gated) ? gated : [];
  let curated = 0;
  let upgrades = 0;
  const items: CurationOutput[] = [];

  for (const g of rows) {
    const row = g as {
      id?: string;
      staging_id?: string;
      title?: string;
      summary?: string;
      source_url?: string;
      source_type?: string;
    };

    // Pull staging for supersedes + full text flags
    let topicKey: string | null = null;
    let supersedes: string | null = null;
    let hasFullText = false;
    if (row.staging_id) {
      const { data: st } = await supabase
        .from('hounddog_staging_items')
        .select('topic_key, supersedes_external_id, full_text_excerpt')
        .eq('id', row.staging_id)
        .maybeSingle();
      if (st) {
        const s = st as {
          topic_key?: string;
          supersedes_external_id?: string;
          full_text_excerpt?: string;
        };
        topicKey = s.topic_key ?? null;
        supersedes = s.supersedes_external_id ?? null;
        hasFullText = Boolean(s.full_text_excerpt);
      }
    }

    const title = row.title ?? 'Curated evidence';
    const summary = (row.summary ?? '').slice(0, 800);
    const sourceUrl = row.source_url ?? '';
    const curationKey = `curate:${contentHash([sourceUrl, title]).slice(0, 24)}`;
    const isUpgrade = Boolean(supersedes);
    if (isUpgrade) upgrades += 1;

    const qualityGrade = gradeFromText(summary, hasFullText);
    const tags = routeTagsFor(topicKey, title, summary);
    const upgradeNote = isUpgrade
      ? ` Evidence upgraded relative to prior record ${supersedes}.`
      : '';

    const out: CurationOutput = {
      curationKey,
      title,
      summary: `${summary}${upgradeNote}`.slice(0, 1000),
      qualityGrade,
      isUpgrade,
      routeTags: tags,
      sourceUrl,
      provenance: [{ url: sourceUrl, gatedId: row.id }],
      supersedesKey: supersedes ?? undefined,
    };

    const { error } = await supabase.from('sherlock_curation_items').upsert(
      {
        gated_id: row.id ?? null,
        curation_key: out.curationKey,
        title: out.title,
        summary: out.summary,
        quality_grade: out.qualityGrade,
        is_upgrade: out.isUpgrade,
        supersedes_curation_key: out.supersedesKey ?? null,
        route_tags: out.routeTags,
        provenance: out.provenance,
        source_url: out.sourceUrl,
        study_type: row.source_type ?? null,
      },
      { onConflict: 'curation_key' },
    );

    if (!error) {
      curated += 1;
      items.push(out);
    }
  }

  safeLog.info('sherlock.curate', 'complete', { curated, upgrades });
  return { curated, upgrades, items };
}

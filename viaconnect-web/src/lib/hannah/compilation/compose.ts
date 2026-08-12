/**
 * Prompt 213a: Hannah composition pure functions.
 * Max 4 distinct insights, multi-hub diversity, no pad/duplicate/fabricate.
 */

import { insightKeyFromHeadline } from '@/hooks/journey/useEngineAccelerators';
import type {
  ComposedInsight,
  SourceHub,
  SupplierDigest,
  SupplierAgent,
} from './types';

const HUB_ORDER: SourceHub[] = [
  'Nutrition',
  'Biology',
  'CAQ',
  'Supplements',
  'Genetics',
  'Labs',
];

function impactFromHub(hub: SourceHub): number {
  if (hub === 'Biology' || hub === 'Nutrition') return 8;
  if (hub === 'CAQ') return 6;
  if (hub === 'Supplements') return 7;
  return 5;
}

function titleFor(hub: SourceHub, sparse: boolean): string {
  if (sparse) {
    if (hub === 'Nutrition') return 'Log a meal to open Nutrition accelerators';
    if (hub === 'Biology') return 'Scan or log composition for Biology lift';
    if (hub === 'CAQ') return 'Complete your CAQ for sharper guidance';
    if (hub === 'Genetics') return 'Upload genetics to unlock panel-matched tips';
    if (hub === 'Labs') return 'Add labs when ready for marker-aware guidance';
    return 'Connect more hubs for deeper insights';
  }
  if (hub === 'Nutrition') return 'Steady nutrition rhythm this window';
  if (hub === 'Biology') return 'Body composition signal in focus';
  if (hub === 'CAQ') return 'CAQ lifestyle lever for Bio Optimization';
  if (hub === 'Supplements') return 'Evidence-backed protocol support';
  if (hub === 'Genetics') return 'Genetics-informed next step';
  return 'Lab-informed recovery cue';
}

/**
 * Compose up to 4 insights targeting hub diversity.
 * Skipped suppliers contribute zero items (already fail-open upstream).
 */
export function composeAcceleratorInsights(
  digests: SupplierDigest[],
  max = 4,
): ComposedInsight[] {
  const byHub = new Map<SourceHub, { summary: string; supplier: SupplierAgent; refs: string[]; sparse: boolean }>();

  for (const d of digests) {
    if (!d.ok && d.skipped) continue;
    for (const item of d.items) {
      const existing = byHub.get(item.hub);
      const sparse =
        item.metricValue === null ||
        /no |not |unknown|sparse|connect|finish|unlock/i.test(item.summary);
      // Prefer non-sparse signal when available.
      if (!existing || (existing.sparse && !sparse)) {
        byHub.set(item.hub, {
          summary: item.summary,
          supplier: d.supplier,
          refs: item.refs ?? [item.id],
          sparse,
        });
      }
    }
  }

  const insights: ComposedInsight[] = [];
  const usedKeys = new Set<string>();

  // Pass 1: one insight per hub in preferred order (diversity).
  for (const hub of HUB_ORDER) {
    if (insights.length >= max) break;
    const hit = byHub.get(hub);
    if (!hit) continue;
    const title = titleFor(hub, hit.sparse);
    const key = insightKeyFromHeadline(`${hub}-${title}`);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    insights.push({
      insightKey: key,
      title,
      description: hit.summary.slice(0, 320),
      category: hub === 'Supplements' ? 'Supplement' : hub,
      sourceHub: hub,
      supplierAgent: hit.supplier,
      sourceRefs: hit.refs,
      estimatedImpact: hit.sparse ? 4 : impactFromHub(hub),
      priority: max - insights.length,
    });
  }

  return insights;
}

/** Weekly Personalized read from the same compiled digests (no contradiction). */
export function composePersonalizedRead(
  digests: SupplierDigest[],
  insights: ComposedInsight[],
  displayName = 'there',
): {
  greeting: string;
  analysis: string;
  recommendation: string;
  focusArea: string;
  estimatedImpact: number;
} {
  const okSuppliers = digests.filter((d) => d.ok && d.items.length > 0).map((d) => d.supplier);
  const hubs = [...new Set(insights.map((i) => i.sourceHub))];
  const top = insights[0];

  const greeting = `Hi ${displayName}, here is your weekly Bio Optimization read.`;
  const analysis =
    hubs.length === 0
      ? 'Sources are still sparse. Connect Nutrition, Biology, or finish your CAQ so accelerators can deepen.'
      : `This week draws on ${hubs.join(', ')} signals from ${okSuppliers.join(', ') || 'available'} suppliers.`;

  const recommendation = top
    ? `${top.title}: ${top.description}`
    : 'Start with one honest step: log a meal or complete a body composition entry.';

  const focusArea = top?.sourceHub ?? 'CAQ';
  const estimatedImpact = top?.estimatedImpact ?? 4;

  return { greeting, analysis, recommendation, focusArea, estimatedImpact };
}

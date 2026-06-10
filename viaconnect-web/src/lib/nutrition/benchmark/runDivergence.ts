/**
 * Prompt 184 Phase 0: the runnable divergence harness.
 *
 * buildReport runs each basket item through the engines (injected, so it is
 * unit-testable without network), computes per-item divergence, aggregates per
 * engine, and dual-engine agreement. formatReportMarkdown renders it. The gated
 * runner in __tests__/runDivergence.bench.test.ts wires the real engines and
 * writes the report; it executes only when NUTRITION_BENCHMARK_MODE is set.
 *
 * Every basket item runs through the text engine; the dual-logged items also
 * run through the photo engine, using the pinned detection.
 */

import type { ParsedItem } from '../parsed-meal-schema';
import type { VisionItem } from '../vision/types';
import type { MealTrace } from './tracePipeline';
import type { BenchmarkBasket } from './basket';
import type { PinnedInput } from './pinned-inputs';
import {
  computeItemDivergence,
  aggregateDivergence,
  dualAgreement,
  type ItemDivergence,
  type EngineAggregate,
  type DualAgreement,
} from './divergence';

export interface EngineRunners {
  runText: (parsed: ParsedItem[]) => Promise<MealTrace>;
  runPhoto: (detection: ReadonlyArray<VisionItem>, photoRef: string) => Promise<MealTrace>;
}

export interface BenchmarkReport {
  note: string;
  items: ItemDivergence[];
  aggregates: EngineAggregate[];
  duals: DualAgreement[];
}

export async function buildReport(
  basket: BenchmarkBasket,
  pins: Record<string, PinnedInput>,
  runners: EngineRunners
): Promise<BenchmarkReport> {
  const items: ItemDivergence[] = [];
  const duals: DualAgreement[] = [];

  for (const item of basket.items) {
    const pin = pins[item.id];
    if (!pin) continue;

    const textTrace = await runners.runText(pin.parsed);
    items.push(computeItemDivergence(item, textTrace));

    if (item.dual_logged && pin.detection && pin.detection.length > 0) {
      const photoTrace = await runners.runPhoto(pin.detection, item.photo_ref ?? item.id);
      items.push(computeItemDivergence(item, photoTrace));
      duals.push(dualAgreement(item.id, textTrace.mealTotals, photoTrace.mealTotals));
    }
  }

  const note = `Targets: ${basket.generated_basis}. Engine inputs are seed pins; regenerate from live AI for the authoritative run.`;
  return { note, items, aggregates: aggregateDivergence(items), duals };
}

function cell(n: number | null): string {
  return n === null ? 'n/a' : String(n);
}

export function formatReportMarkdown(report: BenchmarkReport): string {
  const lines: string[] = [];
  lines.push('# Prompt 184 Divergence Report');
  lines.push('');
  lines.push(report.note);
  lines.push('');

  for (const agg of report.aggregates) {
    lines.push(`## Aggregate: ${agg.engine}`);
    lines.push('');
    lines.push('| metric | MAPE % | mean signed % | n |');
    lines.push('|---|---|---|---|');
    for (const m of agg.metrics) {
      lines.push(`| ${m.metric} | ${cell(m.mapePct)} | ${cell(m.meanSignedPct)} | ${m.n} |`);
    }
    lines.push('');
    if (agg.itemsOverTolerance.length > 0) {
      const over = agg.itemsOverTolerance
        .map((i) => `${i.id} (${i.caloriesSignedPct})`)
        .join(', ');
      lines.push(`Items over 5 percent on calories: ${over}`);
    } else {
      lines.push('No items over 5 percent on calories.');
    }
    lines.push('');
  }

  if (report.duals.length > 0) {
    lines.push('## Dual-engine agreement (photo vs text calories)');
    lines.push('');
    lines.push('| id | photo vs text % | within 3 percent |');
    lines.push('|---|---|---|');
    for (const d of report.duals) {
      const within = d.agreesWithin3Pct === null ? 'n/a' : String(d.agreesWithin3Pct);
      lines.push(`| ${d.id} | ${cell(d.caloriesPhotoVsTextPct)} | ${within} |`);
    }
    lines.push('');
  }

  lines.push('## Per-item detail');
  lines.push('');
  lines.push('| id | engine | category | grams % | calories % | stage | note |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const it of report.items) {
    lines.push(
      `| ${it.id} | ${it.engine} | ${it.category} | ${cell(it.gramsSignedPct)} | ${cell(it.caloriesSignedPct)} | ${it.dominantStage} | ${it.note} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

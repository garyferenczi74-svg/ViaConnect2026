/**
 * Prompt 184 Phase 0: the runnable divergence benchmark.
 *
 * This is the live harness, not a unit test. It is SKIPPED unless
 * NUTRITION_BENCHMARK_MODE is set, because it makes live USDA and OFF calls
 * (and so needs USDA_FDC_API_KEY). To produce the report:
 *
 *   NUTRITION_BENCHMARK_MODE=true NUTRITION_DIAGNOSTICS_ENABLED=true \
 *     npx vitest run src/lib/nutrition/benchmark/__tests__/runDivergence.bench.test.ts
 *
 * It writes docs/prompts/prompt-184-divergence-report.md and logs the report.
 * The engine inputs are the seed pins in pinned-inputs.ts; regenerate those from
 * a live Gemini parse and vision detection for the authoritative numbers, and
 * swap the basket targets to the five-app medians when available.
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isNutritionBenchmarkMode } from '../../diagnostic-flags';
import { buildReport, formatReportMarkdown } from '../runDivergence';
import { loadBenchmarkBasket } from '../basket';
import { PINNED_INPUTS } from '../pinned-inputs';
import { traceTextPipeline, tracePhotoPipeline } from '../tracePipeline';

describe.skipIf(!isNutritionBenchmarkMode())('divergence benchmark run (live)', () => {
  it(
    'runs the basket through both engines and writes the report',
    async () => {
      const basket = loadBenchmarkBasket();
      const report = await buildReport(basket, PINNED_INPUTS, {
        runText: (parsed) => traceTextPipeline(parsed),
        runPhoto: (detection, photoRef) => tracePhotoPipeline(detection, photoRef),
      });
      const markdown = formatReportMarkdown(report);
      // eslint-disable-next-line no-console
      console.log(markdown);
      const out = resolve(process.cwd(), 'docs/prompts/prompt-184-divergence-report.md');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, markdown, 'utf8');
      expect(report.items.length).toBeGreaterThanOrEqual(basket.items.length);
    },
    180000
  );
});

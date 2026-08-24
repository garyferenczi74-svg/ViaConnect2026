import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Brief 3 MealCard wiring', () => {
  it('photo-ai persist-and-review hits the shared log-meal review', () => {
    const src = read(
      'src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx',
    );
    expect(src).toContain('/api/nutrition/pending-review');
    expect(src).toContain('/nutrition/log-meal/review?logId=');
    expect(src).toContain("persistDraftToReview(newDraft, 'voice')");
    expect(src).toContain('persistDraftToReview(analysis.mealDraft, lastEntrySource)');
  });

  it('capturing phase is cancellable and gallery does not stick on capturing', () => {
    const src = read(
      'src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx',
    );
    expect(src).toContain('handleCancelCapture');
    expect(src).toContain("source === 'gallery'");
    expect(src).toContain('Opening camera');
    const hook = read(
      'src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/hooks/useCameraCapture.ts',
    );
    expect(hook).toContain('NUTRIVISION_CAMERA_CAPTURE_TIMEOUT_MS');
    expect(hook).toContain("source === 'camera'");
  });

  it('review form mounts protocol chips and micro rings', () => {
    const src = read(
      'src/app/(app)/(consumer)/nutrition/log-meal/review/ReviewForm.tsx',
    );
    expect(src).toContain('ProtocolMatchChips');
    expect(src).toContain('ProtocolMicroRings');
    expect(src).toContain('educationalNote');
  });

  it('discard deletes linked meals so the meal does not persist', () => {
    const src = read('src/app/api/nutrition/discard/route.ts');
    expect(src).toContain("from('meals')");
    expect(src).toContain('legacy_nutrition_log_id');
    expect(src).toContain('.delete()');
    expect(src).toContain('Could not discard. Your meal is still here.');
  });

  it('dictation-only text entry still lands on the same review cards', () => {
    const logMeal = read(
      'src/app/(app)/(consumer)/nutrition/log-meal/page.tsx',
    );
    expect(logMeal).toContain("usedDictationRef.current ? 'dictation' : 'text'");
    expect(logMeal).toContain('/nutrition/log-meal/review?logId=');
    const analyze = read('src/app/api/nutrition/analyze-text/route.ts');
    expect(analyze).toContain('encodePendingRawInput');
    expect(analyze).toContain('mealCardSource');
    const review = read(
      'src/app/(app)/(consumer)/nutrition/log-meal/review/ReviewForm.tsx',
    );
    expect(review).toContain('ProtocolMatchChips');
    expect(review).toContain('ProtocolMicroRings');
  });

  it('new UI stays on existing chrome with Lucide 1.5 and no banned claims', () => {
    const files = [
      'src/components/nutrition/meal-card/ProtocolMatchChips.tsx',
      'src/components/nutrition/meal-card/ProtocolMicroRings.tsx',
      'src/lib/nutrition/meal-card-contract/protocolMatch.ts',
      'src/app/(app)/(consumer)/nutrition/log-meal/review/ReviewForm.tsx',
    ].map(read);
    const blob = files.join('\n');
    expect(blob).toContain('strokeWidth={1.5}');
    expect(blob).toContain('#1E3054');
    expect(blob.toLowerCase()).not.toContain('semaglutide');
    expect(blob).not.toMatch(/10\s*[–-]\s*27x/);
    expect(blob).not.toMatch(/:\s*any\b/);
    expect(blob).not.toMatch(/\bas any\b/);
  });
});

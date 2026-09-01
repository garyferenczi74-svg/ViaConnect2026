import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_FORMAVISION_VISION_MODEL,
  VISION_MODEL_CONFIG_USER_ERROR,
  clientSafeVisionModelError,
  isSecretLikeValue,
  isUsableVisionModelId,
  redactSecretsForLog,
  resolveVisionModel,
  sanitizeAnalyzeUserError,
} from '../visionModel';

describe('FormaVision vision model resolution', () => {
  it('uses a configured Claude model id', () => {
    expect(resolveVisionModel('claude-sonnet-4-6')).toEqual({
      model: 'claude-sonnet-4-6',
      usedFallback: false,
    });
    expect(resolveVisionModel('claude-sonnet-4-20250514')).toEqual({
      model: 'claude-sonnet-4-20250514',
      usedFallback: false,
    });
    expect(isUsableVisionModelId(DEFAULT_FORMAVISION_VISION_MODEL)).toBe(true);
  });

  it('rejects API keys and other secret-shaped env values', () => {
    const key = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789';
    expect(isSecretLikeValue(key)).toBe(true);
    expect(isUsableVisionModelId(key)).toBe(false);
    expect(resolveVisionModel(key)).toEqual({
      model: DEFAULT_FORMAVISION_VISION_MODEL,
      usedFallback: true,
    });
    expect(resolveVisionModel('sk-proj-not-a-model-id-at-all')).toEqual({
      model: DEFAULT_FORMAVISION_VISION_MODEL,
      usedFallback: true,
    });
    expect(isSecretLikeValue('key-abcdefghijklmnopqrstuvwxyz0123456789')).toBe(true);
    expect(isSecretLikeValue('Bearer abcdefghijklmnopqrstuvwxyz0123')).toBe(true);
    expect(isSecretLikeValue('a'.repeat(48))).toBe(true);
    expect(resolveVisionModel('key-abcdefghijklmnopqrstuvwxyz0123456789').model).toBe(
      DEFAULT_FORMAVISION_VISION_MODEL,
    );
  });

  it('falls back when env is empty or not a Claude id', () => {
    expect(resolveVisionModel(undefined)).toEqual({
      model: DEFAULT_FORMAVISION_VISION_MODEL,
      usedFallback: false,
    });
    expect(resolveVisionModel('')).toEqual({
      model: DEFAULT_FORMAVISION_VISION_MODEL,
      usedFallback: false,
    });
    expect(resolveVisionModel('gpt-4o')).toEqual({
      model: DEFAULT_FORMAVISION_VISION_MODEL,
      usedFallback: true,
    });
  });

  it('never returns secrets in user-visible analyze errors', () => {
    const leaked = 'invalid vision model: sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
    expect(sanitizeAnalyzeUserError(leaked)).toBe(VISION_MODEL_CONFIG_USER_ERROR);
    expect(sanitizeAnalyzeUserError(leaked)).not.toMatch(/sk-ant-/);
    expect(clientSafeVisionModelError(leaked)).toBe('invalid vision model configuration');
    expect(clientSafeVisionModelError(leaked)).not.toContain(leaked);
    expect(sanitizeAnalyzeUserError('vision timed out')).toBe('vision timed out');
    expect(sanitizeAnalyzeUserError('Add at least one photo. Missing views are skipped, not invented.')).toMatch(
      /Add at least one photo/,
    );
    expect(sanitizeAnalyzeUserError('')).toBe('Analysis failed');
  });

  it('redacts secret-shaped tokens from log previews', () => {
    const preview = redactSecretsForLog(
      'not_found_error: model sk-ant-api03-abcdefghijklmnopqrstuvwxyz does not exist',
    );
    expect(preview).not.toMatch(/sk-ant-/);
    expect(preview).toContain('[redacted]');
  });

  it('Deno edge mirror stays aligned with the client helper', () => {
    const root = join(process.cwd());
    const client = readFileSync(join(root, 'src/lib/body-tracker/composition/visionModel.ts'), 'utf8');
    const edge = readFileSync(join(root, 'supabase/functions/_shared/vision-model.ts'), 'utf8');
    expect(edge).toContain(DEFAULT_FORMAVISION_VISION_MODEL);
    expect(edge).toContain(VISION_MODEL_CONFIG_USER_ERROR);
    expect(edge).toContain('export function resolveVisionModel');
    expect(edge).toContain('export function clientSafeVisionModelError');
    expect(edge).toContain('export function sanitizeAnalyzeUserError');
    expect(client).toContain(VISION_MODEL_CONFIG_USER_ERROR);
  });
});

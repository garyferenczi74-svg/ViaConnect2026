// Prompt 170r authoring pipeline: frontmatter + clinical-claim linter
// against the 11 Nutrition by Genetics cards.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadEducationalCards, resolveEducationalCardsRoot } from '@/lib/content/authoring-pipeline/card-reader';
import { lintEducationalCard } from '@/lib/content/authoring-pipeline/internal-linter';
import {
  canonicalizeSafetyModeFilter,
  decidePublish,
} from '@/lib/content/authoring-pipeline/publish-plan';
import { validateCardFrontmatter } from '@/lib/content/authoring-pipeline/validate-frontmatter';
import { parseSimpleYaml, splitMarkdownFrontmatter } from '@/lib/content/authoring-pipeline/yaml-frontmatter';

const ROOT = resolveEducationalCardsRoot(join(__dirname, '..', '..'));

describe('170r educational card authoring pipeline', () => {
  const cards = loadEducationalCards(ROOT);

  it('loads the 11 genetics cards and skips INDEX.md', () => {
    expect(cards).toHaveLength(11);
    expect(cards.every((card) => card.relativePath.endsWith('.md'))).toBe(true);
    expect(cards.some((card) => card.relativePath.toLowerCase().includes('index.md'))).toBe(false);
  });

  it('validates required frontmatter on every genetics card', () => {
    for (const card of cards) {
      const result = validateCardFrontmatter(card);
      expect(result.issues, card.relativePath).toEqual([]);
      expect(result.ok).toBe(true);
      expect(card.frontmatter.primary_category).toBe('genetic_education');
      expect(card.frontmatter.safety_mode_filter.length).toBeGreaterThan(0);
      expect(card.title.length).toBeGreaterThan(0);
    }
  });

  it('passes the clinical-claim linter on the 11 genetics cards', () => {
    for (const card of cards) {
      const result = lintEducationalCard(card);
      expect(result.findings, `${card.relativePath}: ${JSON.stringify(result.findings)}`).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it('can mark genetics cards published when gary_approved_at is present', () => {
    for (const card of cards) {
      expect(card.frontmatter.gary_approved_at).toBe('2026-08-23');
      const decision = decidePublish({
        card,
        validation: validateCardFrontmatter(card),
        lint: lintEducationalCard(card),
      });
      expect(decision.writeDraft).toBe(true);
      expect(decision.markPublished).toBe(true);
      expect(decision.draftState).toBe('published');
    }
  });

  it('keeps high-caution cards unpublished without gary_approved_at', () => {
    const card = cards[0];
    const blocked = {
      ...card,
      frontmatter: {
        ...card.frontmatter,
        gary_approved_at: null,
        medical_caution_level: 'high',
      },
    };
    const decision = decidePublish({
      card: blocked,
      validation: { ok: true, issues: [] },
      lint: { ok: true, findings: [] },
    });
    expect(decision.markPublished).toBe(false);
    expect(decision.draftState).toBe('gary_approval');
  });

  it('maps authored safety filters onto the 170r CHECK vocabulary', () => {
    expect(canonicalizeSafetyModeFilter('do_not_surface_safety_mode')).toBe(
      'do_not_surface_safety_mode',
    );
    expect(canonicalizeSafetyModeFilter('medium_education_only')).toBe('surface');
    expect(canonicalizeSafetyModeFilter('inherit_child_caution')).toBe('surface');
  });

  it('fails the linter on em dashes, Semaglutide, and un-negated cure claims', () => {
    const template = cards[0];
    const dirty = {
      ...template,
      frontmatterRaw: template.frontmatterRaw,
      body: [
        'This product will cure fatigue.',
        `Range ${String.fromCharCode(0x2014)} not allowed.`,
        'Consider Semaglutide for weight.',
        '',
        '## FDA disclaimer',
        'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
      ].join('\n'),
      hasFdaDisclaimer: true,
    };
    const result = lintEducationalCard(dirty);
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === 'em_dash')).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'semaglutide')).toBe(true);
    expect(
      result.findings.some(
        (finding) =>
          finding.code === 'diagnose_treat_cure' || finding.code === 'clinical_claim',
      ),
    ).toBe(true);
  });

  it('parses YAML arrays used by the genetics cards', () => {
    const raw = readFileSync(cards[0].filePath, 'utf8');
    const split = splitMarkdownFrontmatter(raw);
    const yaml = parseSimpleYaml(split.frontmatter);
    expect(typeof yaml.slug).toBe('string');
    expect(Array.isArray(yaml.secondary_tags)).toBe(true);
  });
});

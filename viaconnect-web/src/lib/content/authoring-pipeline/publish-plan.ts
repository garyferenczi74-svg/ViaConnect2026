// Publish gate for 170r markdown cards.
// Drafts always write. Published only when the linter passes and approval
// rules hold. Genetic education is high-caution unless gary_approved_at
// is present in frontmatter.

import type {
  CanonicalSafetyModeFilter,
  CardLintResult,
  FrontmatterValidation,
  ParsedCard,
  PublishDecision,
} from './types';
import { CANONICAL_SAFETY_MODE_FILTERS } from './types';

export function decidePublish(input: {
  card: ParsedCard;
  validation: FrontmatterValidation;
  lint: CardLintResult;
}): PublishDecision {
  const reasons: string[] = [];
  const { card, validation, lint } = input;

  if (!validation.ok) {
    reasons.push('frontmatter validation failed');
  }
  if (!lint.ok) {
    reasons.push('clinical-claim linter failed');
  }

  const garyApproved = Boolean(card.frontmatter.gary_approved_at);
  const caution = card.frontmatter.medical_caution_level;
  const genetic = card.frontmatter.primary_category === 'genetic_education';
  const highCaution = caution === 'high' || genetic;

  if (highCaution && !garyApproved) {
    reasons.push(
      genetic
        ? 'genetic_education cards stay unpublished until gary_approved_at is set'
        : 'high medical_caution_level requires gary_approved_at',
    );
  }

  const markPublished = reasons.length === 0;

  let draftState: PublishDecision['draftState'];
  if (!lint.ok || !validation.ok) {
    draftState = 'linter_check';
  } else if (highCaution && !garyApproved) {
    draftState = 'gary_approval';
  } else if (markPublished) {
    draftState = 'published';
  } else {
    draftState = 'approved';
  }

  return {
    writeDraft: true,
    markPublished,
    draftState,
    reasons,
  };
}

export function canonicalizeSafetyModeFilter(
  authored: string,
): CanonicalSafetyModeFilter {
  if (
    (CANONICAL_SAFETY_MODE_FILTERS as readonly string[]).includes(authored)
  ) {
    return authored as CanonicalSafetyModeFilter;
  }
  if (authored.startsWith('do_not_surface')) {
    return 'do_not_surface_safety_mode';
  }
  if (authored.startsWith('surface_only')) {
    return 'surface_only_safety_mode';
  }
  return 'surface';
}

export function toIsoTimestamp(dateText: string | null): string | null {
  if (!dateText) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return `${dateText}T00:00:00.000Z`;
  }
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export interface ContentCardRow {
  slug: string;
  title: string;
  subtitle: string | null;
  lead_text: string;
  body_markdown: string;
  key_takeaways_jsonb: string[];
  what_to_do_next_jsonb: string[];
  related_card_ids: string[];
  citations_jsonb: ParsedCard['citations'];
  fda_disclaimer_variant: string;
  primary_category: string;
  secondary_tags: string[];
  triggering_caq_flags_jsonb: string[];
  triggering_meal_patterns_jsonb: string[];
  triggering_supplement_patterns_jsonb: string[];
  relevance_score_weights_jsonb: null;
  prerequisite_card_ids: string[];
  safety_mode_filter: CanonicalSafetyModeFilter;
  medical_caution_level: string;
  bioavailability_bridge_card: boolean;
  estimated_reading_time_minutes: number;
  word_count: number;
  is_published: boolean;
  published_at: string | null;
  last_reviewed_at: string | null;
  kelsey_compliance_review_id: string | null;
  gary_approval_required: boolean;
  gary_approved_at: string | null;
}

export function buildContentCardRow(
  card: ParsedCard,
  decision: PublishDecision,
  relatedCardIds: string[] = [],
): ContentCardRow {
  const approvedAt = toIsoTimestamp(card.frontmatter.gary_approved_at);
  return {
    slug: card.frontmatter.slug,
    title: card.title,
    subtitle: card.subtitle,
    lead_text: card.leadText || card.title,
    body_markdown: card.body,
    key_takeaways_jsonb: card.keyTakeaways,
    what_to_do_next_jsonb: card.whatToDoNext,
    related_card_ids: relatedCardIds,
    citations_jsonb: card.citations,
    fda_disclaimer_variant: card.frontmatter.fda_disclaimer_variant,
    primary_category: card.frontmatter.primary_category,
    secondary_tags: card.frontmatter.secondary_tags,
    triggering_caq_flags_jsonb: card.frontmatter.triggering_caq_flags,
    triggering_meal_patterns_jsonb: card.frontmatter.triggering_meal_patterns,
    triggering_supplement_patterns_jsonb:
      card.frontmatter.triggering_supplement_patterns,
    relevance_score_weights_jsonb: null,
    prerequisite_card_ids: [],
    safety_mode_filter: canonicalizeSafetyModeFilter(
      card.frontmatter.safety_mode_filter,
    ),
    medical_caution_level: card.frontmatter.medical_caution_level,
    bioavailability_bridge_card: card.frontmatter.bioavailability_bridge_card,
    estimated_reading_time_minutes: card.estimatedReadingTimeMinutes,
    word_count: card.wordCount,
    is_published: decision.markPublished,
    published_at: decision.markPublished ? new Date().toISOString() : null,
    last_reviewed_at: approvedAt,
    kelsey_compliance_review_id: card.frontmatter.kelsey_compliance_review_id,
    gary_approval_required:
      card.frontmatter.gary_approval_required ||
      card.frontmatter.primary_category === 'genetic_education' ||
      card.frontmatter.medical_caution_level === 'high',
    gary_approved_at: approvedAt,
  };
}

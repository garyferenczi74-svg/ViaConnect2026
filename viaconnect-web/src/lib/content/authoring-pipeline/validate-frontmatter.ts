// Required 170r frontmatter: slug, title, primary_category (8 taxonomy
// values), medical_caution_level, safety_mode_filter.

import {
  MEDICAL_CAUTION_LEVELS,
  PRIMARY_CATEGORIES,
  type FieldIssue,
  type FrontmatterValidation,
  type ParsedCard,
} from './types';

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateCardFrontmatter(card: ParsedCard): FrontmatterValidation {
  const issues: FieldIssue[] = [];
  const fm = card.frontmatter;

  if (!fm.slug) {
    issues.push({ field: 'slug', message: 'slug is required' });
  } else if (!SLUG_RX.test(fm.slug)) {
    issues.push({
      field: 'slug',
      message: `slug must be kebab-case (got ${fm.slug})`,
    });
  }

  if (!card.title) {
    issues.push({
      field: 'title',
      message: 'title is required in frontmatter or as the first H1',
    });
  }

  if (!fm.primary_category) {
    issues.push({
      field: 'primary_category',
      message: 'primary_category is required',
    });
  } else if (
    !(PRIMARY_CATEGORIES as readonly string[]).includes(fm.primary_category)
  ) {
    issues.push({
      field: 'primary_category',
      message: `primary_category must be one of: ${PRIMARY_CATEGORIES.join(', ')}`,
    });
  }

  if (!fm.medical_caution_level) {
    issues.push({
      field: 'medical_caution_level',
      message: 'medical_caution_level is required',
    });
  } else if (
    !(MEDICAL_CAUTION_LEVELS as readonly string[]).includes(
      fm.medical_caution_level,
    )
  ) {
    issues.push({
      field: 'medical_caution_level',
      message: 'medical_caution_level must be low, medium, or high',
    });
  }

  if (!fm.safety_mode_filter) {
    issues.push({
      field: 'safety_mode_filter',
      message: 'safety_mode_filter is required',
    });
  }

  if (fm.gary_approved_at && !/^\d{4}-\d{2}-\d{2}/.test(fm.gary_approved_at)) {
    issues.push({
      field: 'gary_approved_at',
      message: 'gary_approved_at must be an ISO date (YYYY-MM-DD)',
    });
  }

  return { ok: issues.length === 0, issues };
}

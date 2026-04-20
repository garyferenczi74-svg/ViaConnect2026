// Prompt #96 Phase 4: DB-backed compliance orchestrators.
//
// Thin wrappers around the pure compliance helpers that fetch the
// signals from Supabase, call the pure core, and persist the side
// effects. Keeping these out of the API route files lets us re-use the
// same orchestration logic from a future Edge Function (e.g. SLA-tick).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  runComplianceChecklist,
  determineRequiredReviewers,
  evaluateApprovalGate,
  type ChecklistResult,
  type ApprovalGateResult,
  type ReviewerRole,
} from './compliance';
import { CANONICAL_MANUFACTURER_LINE } from './schema-types';

interface OrchestratorDeps {
  supabase: SupabaseClient | unknown;
}

// Heuristic: a SKU is treated as having allergens when product_catalog
// row has any contraindication_tags entry that names an allergen.
const ALLERGEN_TAGS = new Set([
  'allergen', 'tree_nuts', 'peanuts', 'soy', 'dairy', 'milk',
  'eggs', 'wheat', 'gluten', 'shellfish', 'fish', 'sesame',
]);

export async function runAutomatedComplianceChecklist(
  labelDesignId: string,
  deps: OrchestratorDeps,
): Promise<{ result: ChecklistResult; review_id: string | null }> {
  const sb = deps.supabase as any;

  const { data: design } = await sb
    .from('white_label_label_designs')
    .select('*, practitioner_brand_configurations(*), product_catalog(id, contraindication_tags)')
    .eq('id', labelDesignId)
    .maybeSingle();
  if (!design) throw new Error(`Label design ${labelDesignId} not found`);

  const productHasAllergens = Array.isArray(design.product_catalog?.contraindication_tags) &&
    design.product_catalog.contraindication_tags.some((t: string) => ALLERGEN_TAGS.has(t?.toLowerCase()));

  const result = runComplianceChecklist({
    design: {
      display_product_name: design.display_product_name,
      short_description: design.short_description,
      long_description: design.long_description,
      tagline: design.tagline,
      structure_function_claims: design.structure_function_claims ?? [],
      usage_directions: design.usage_directions,
      warning_text: design.warning_text,
      allergen_statement: design.allergen_statement,
      other_ingredients: design.other_ingredients,
      manufacturer_line: design.manufacturer_line ?? CANONICAL_MANUFACTURER_LINE,
      supplement_facts_panel_data: design.supplement_facts_panel_data,
    },
    brand: {
      practice_legal_name: design.practitioner_brand_configurations?.practice_legal_name ?? '',
      practice_address_line_1: design.practitioner_brand_configurations?.practice_address_line_1 ?? '',
      practice_phone: design.practitioner_brand_configurations?.practice_phone ?? '',
    },
    productHasAllergens,
  });

  const { data: review, error } = await sb
    .from('white_label_compliance_reviews')
    .insert({
      label_design_id: labelDesignId,
      review_type: 'automated_checklist',
      reviewer_role: 'automated',
      decision: result.overall_passed ? 'approved' : 'revision_requested',
      checklist_results: { checks: [...result.passed_items, ...result.warning_failures, ...result.blocker_failures] },
      flagged_items: [...result.blocker_failures, ...result.warning_failures],
      decision_notes: result.overall_passed
        ? `Automated checklist passed. ${result.warning_failures.length} warnings noted.`
        : `Automated checklist failed. ${result.blocker_failures.length} blocker failures must be resolved before human review.`,
    })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Failed to log automated review: ${error.message}`);

  return { result, review_id: review?.id ?? null };
}

/**
 * Open reviewer assignment rows for the given roles. Idempotent:
 * upsert on (label_design_id, reviewer_role).
 *
 * Audit fix: when a label is revised the new version gets a fresh
 * label_design_id, but pending assignments tied to the prior version
 * remain in the table and would still surface in the inbox view if it
 * did not filter by is_current_version. We delete pending assignments
 * for prior versions of the same (practitioner, product) before
 * upserting the new ones so the inbox stays clean even without
 * relying on the view filter.
 */
export async function openReviewerAssignments(
  labelDesignId: string,
  roles: ReviewerRole[],
  deps: OrchestratorDeps,
): Promise<void> {
  const sb = deps.supabase as any;
  if (roles.length === 0) return;

  const { data: design } = await sb
    .from('white_label_label_designs')
    .select('practitioner_id, product_catalog_id')
    .eq('id', labelDesignId)
    .maybeSingle();

  if (design) {
    const { data: priorVersions } = await sb
      .from('white_label_label_designs')
      .select('id')
      .eq('practitioner_id', design.practitioner_id)
      .eq('product_catalog_id', design.product_catalog_id)
      .eq('is_current_version', false);
    const priorIds = ((priorVersions ?? []) as Array<{ id: string }>).map((d) => d.id);
    if (priorIds.length > 0) {
      await sb
        .from('white_label_reviewer_assignments')
        .delete()
        .in('label_design_id', priorIds)
        .eq('status', 'pending');
    }
  }

  const rows = roles.map((role) => ({
    label_design_id: labelDesignId,
    reviewer_role: role,
    status: 'pending',
    assigned_at: new Date().toISOString(),
  }));
  await sb
    .from('white_label_reviewer_assignments')
    .upsert(rows, { onConflict: 'label_design_id,reviewer_role' });
}

/**
 * Re-runs the approval gate for a label by reading the immutable
 * compliance_reviews log and rerouting the design's status. Returns the
 * computed status and the list of reviewers still awaited.
 */
export async function recomputeApprovalGate(
  labelDesignId: string,
  deps: OrchestratorDeps,
): Promise<ApprovalGateResult> {
  const sb = deps.supabase as any;

  const { data: design } = await sb
    .from('white_label_label_designs')
    .select('id, structure_function_claims, status')
    .eq('id', labelDesignId)
    .maybeSingle();
  if (!design) throw new Error(`Label design ${labelDesignId} not found`);

  const required = determineRequiredReviewers(design.structure_function_claims ?? []);

  const { data: reviews } = await sb
    .from('white_label_compliance_reviews')
    .select('reviewer_role, decision, reviewed_at, review_type')
    .eq('label_design_id', labelDesignId)
    .in('review_type', ['compliance_review', 'medical_claims_review'])
    .order('reviewed_at', { ascending: true });

  const decisions = ((reviews ?? []) as Array<{ reviewer_role: string; decision: string; reviewed_at: string }>)
    .filter((r) => r.reviewer_role === 'compliance_officer' || r.reviewer_role === 'medical_director')
    .map((r) => ({
      reviewer_role: r.reviewer_role as ReviewerRole,
      decision: r.decision as 'approved' | 'revision_requested' | 'rejected',
      reviewed_at: r.reviewed_at,
    }));

  return evaluateApprovalGate({ required_reviewer_roles: required, decisions });
}

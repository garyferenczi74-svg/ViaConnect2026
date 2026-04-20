// Prompt #97 Phase 5.2: Level 4 pricing calculator (pure, 90%+ coverage gate).
//
// Builds price up from actual per-unit COGS (sum of ingredient doses ×
// per-mg costs), applies manufacturing overhead + QA/QC + packaging labor,
// then ViaCura markup, optional expedited surcharge, then
// subtracts development-fee credit for the first production order of each
// formulation.

export interface Level4Parameters {
  developmentFeeCents: number;
  medicalReviewFeeCents: number;
  moqPerFormulation: number;
  minimumOrderValueCents: number;
  manufacturingOverheadPercent: number;
  qaQcPercent: number;
  packagingLaborPercent: number;
  markupPercent: number;
  expeditedSurchargePercent: number;
}

export const DEFAULT_LEVEL_4_PARAMETERS: Level4Parameters = {
  developmentFeeCents: 388800,
  medicalReviewFeeCents: 88800,
  moqPerFormulation: 500,
  minimumOrderValueCents: 3000000,
  manufacturingOverheadPercent: 25,
  qaQcPercent: 8,
  packagingLaborPercent: 5,
  markupPercent: 40,
  expeditedSurchargePercent: 20,
};

export interface Level4QuoteLineItem {
  customFormulationId: string;
  quantity: number;
  unitCogsCents: number;
  /** True iff THIS line item should receive the development fee credit. */
  firstProductionOrder: boolean;
}

export interface Level4QuoteInput {
  items: Level4QuoteLineItem[];
  timeline: 'standard' | 'expedited';
  parameters?: Level4Parameters;
}

export interface Level4QuoteLineResult {
  customFormulationId: string;
  quantity: number;
  unitCogsCents: number;
  manufacturingOverheadCents: number;
  qaQcCents: number;
  packagingLaborCents: number;
  totalUnitCostCents: number;
  markupCents: number;
  unitPriceCents: number;
  lineSubtotalCents: number;
}

export interface Level4QuoteResult {
  lineItems: Level4QuoteLineResult[];
  totalUnits: number;
  subtotalCents: number;
  expeditedSurchargeCents: number;
  developmentFeeCreditCents: number;
  totalCents: number;
  depositCents: number;
  finalPaymentCents: number;
  meetsMinimumOrderValue: boolean;
  meetsMoqPerFormulation: boolean;
  minimumOrderValueCents: number;
  moqPerFormulation: number;
  violations: string[];
}

/** Pure: compute a Level 4 quote. Every input unit is integer cents;
 *  every output field is integer cents. Percent parameters are integers
 *  (25 means 25%). */
export function calculateLevel4Quote(input: Level4QuoteInput): Level4QuoteResult {
  const params = input.parameters ?? DEFAULT_LEVEL_4_PARAMETERS;
  const violations: string[] = [];

  const lineItems: Level4QuoteLineResult[] = input.items.map((item) => {
    const overhead = Math.ceil((item.unitCogsCents * params.manufacturingOverheadPercent) / 100);
    const qaQc = Math.ceil((item.unitCogsCents * params.qaQcPercent) / 100);
    const packaging = Math.ceil((item.unitCogsCents * params.packagingLaborPercent) / 100);
    const totalUnitCost = item.unitCogsCents + overhead + qaQc + packaging;
    const markup = Math.ceil((totalUnitCost * params.markupPercent) / 100);
    const unitPrice = totalUnitCost + markup;
    const lineSubtotal = unitPrice * item.quantity;

    return {
      customFormulationId: item.customFormulationId,
      quantity: item.quantity,
      unitCogsCents: item.unitCogsCents,
      manufacturingOverheadCents: overhead,
      qaQcCents: qaQc,
      packagingLaborCents: packaging,
      totalUnitCostCents: totalUnitCost,
      markupCents: markup,
      unitPriceCents: unitPrice,
      lineSubtotalCents: lineSubtotal,
    };
  });

  const totalUnits = lineItems.reduce((sum, l) => sum + l.quantity, 0);
  const subtotalCents = lineItems.reduce((sum, l) => sum + l.lineSubtotalCents, 0);

  const expeditedSurchargeCents =
    input.timeline === 'expedited'
      ? Math.ceil((subtotalCents * params.expeditedSurchargePercent) / 100)
      : 0;

  const subtotalWithSurcharge = subtotalCents + expeditedSurchargeCents;

  // Development fee credit: one-time per formulation, applied on first
  // production order. Sum credits across items flagged.
  const firstOrderItemCount = input.items.filter((i) => i.firstProductionOrder).length;
  const developmentFeeCreditCents = firstOrderItemCount * params.developmentFeeCents;

  const totalCents = Math.max(0, subtotalWithSurcharge - developmentFeeCreditCents);
  const depositCents = Math.ceil(totalCents / 2);
  const finalPaymentCents = totalCents - depositCents;

  // MOQ check: each line must meet per-formulation MOQ.
  const moqViolations = input.items.filter((i) => i.quantity < params.moqPerFormulation);
  for (const v of moqViolations) {
    violations.push(
      `Formulation ${v.customFormulationId} quantity ${v.quantity} below MOQ of ${params.moqPerFormulation}`,
    );
  }

  const meetsMinimumOrderValue = totalCents >= params.minimumOrderValueCents;
  if (!meetsMinimumOrderValue) {
    violations.push(
      `Total order value $${(totalCents / 100).toFixed(2)} below minimum $${(params.minimumOrderValueCents / 100).toFixed(2)}`,
    );
  }

  return {
    lineItems,
    totalUnits,
    subtotalCents,
    expeditedSurchargeCents,
    developmentFeeCreditCents,
    totalCents,
    depositCents,
    finalPaymentCents,
    meetsMinimumOrderValue,
    meetsMoqPerFormulation: moqViolations.length === 0,
    minimumOrderValueCents: params.minimumOrderValueCents,
    moqPerFormulation: params.moqPerFormulation,
    violations,
  };
}

/** Pure: compute the development-fee refund amount given a trigger reason.
 *  Returns 0 cents when fee is applied as order credit; otherwise returns
 *  developmentFee - adminFeeRetained for abandonment / validation failure,
 *  or full developmentFee for ViaCura sourcing failures (no admin fee). */
export function computeDevelopmentFeeRefund(params: {
  developmentFeePaidCents: number;
  adminFeeRetainedCents: number;
  reason:
    | 'applied_to_first_production_order'
    | 'practitioner_abandoned'
    | 'validation_failed'
    | 'medical_review_rejected'
    | 'regulatory_review_rejected'
    | 'viacura_cannot_source'
    | 'admin_override_refund';
}): { refundCents: number; retainedAdminFeeCents: number } {
  if (params.reason === 'applied_to_first_production_order') {
    // Credit applied to order rather than refunded cash. No refund.
    return { refundCents: 0, retainedAdminFeeCents: 0 };
  }
  if (params.reason === 'viacura_cannot_source' || params.reason === 'admin_override_refund') {
    // Full refund when ViaCura is at fault or admin override.
    return { refundCents: params.developmentFeePaidCents, retainedAdminFeeCents: 0 };
  }
  // practitioner_abandoned / validation_failed / medical_review_rejected /
  // regulatory_review_rejected: retain the $500 admin fee.
  const refund = Math.max(0, params.developmentFeePaidCents - params.adminFeeRetainedCents);
  return {
    refundCents: refund,
    retainedAdminFeeCents: params.adminFeeRetainedCents,
  };
}

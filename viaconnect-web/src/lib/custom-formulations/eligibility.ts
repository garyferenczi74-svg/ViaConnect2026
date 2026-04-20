// Prompt #97 Phase 2.1: Level 4 eligibility verification.
//
// Eligibility is stricter than Level 3: requires BOTH
//   1. Active Level 3 Master Practitioner certification, AND
//   2. At least one delivered Level 3 white-label production order.
//
// AND logic is deliberate — tightens gate vs Level 3's OR logic — because
// Level 4 is the highest-commitment tier and early signal of practitioner
// durability (delivered order) is required before granting custom
// formulation access.
//
// Dependency note: practitioner_certifications (Prompt #91 revised) and
// white_label_production_orders (Prompt #96) are not yet live in this
// database. The DB-backed wrapper returns `dependency_pending` status so
// the practitioner UI can render a clear "activation pending Prompt #91/#96"
// message instead of a misleading false-negative.

import { createClient } from '@/lib/supabase/server';

export interface EligibilityInput {
  masterCertActive: boolean;
  masterCert?: {
    id: string;
    certifiedAt: string;
    expiresAt: string;
  };
  deliveredLevel3OrderExists: boolean;
  deliveredOrder?: {
    id: string;
    deliveredAt: string;
    orderNumber: string;
  };
  dependencyPending?: boolean;
}

export interface EligibilityResult {
  isEligible: boolean;
  dependencyPending: boolean;
  masterCertActive: boolean;
  deliveredLevel3OrderExists: boolean;
  evidence: {
    certification?: { id: string; certifiedAt: string; expiresAt: string };
    deliveredOrder?: { id: string; deliveredAt: string; orderNumber: string };
  };
  reasons: string[];
}

/** Pure: given verified inputs, compute the eligibility result. Separated
 *  from the DB-backed wrapper so every branch is unit-testable. */
export function computeEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];

  if (input.dependencyPending) {
    reasons.push(
      'Level 4 eligibility verification is waiting on Prompt #91 revised (practitioner_certifications) and Prompt #96 (white_label_production_orders) to apply. Enrollment opens once those tables ship.',
    );
    return {
      isEligible: false,
      dependencyPending: true,
      masterCertActive: false,
      deliveredLevel3OrderExists: false,
      evidence: {},
      reasons,
    };
  }

  if (input.masterCertActive) {
    reasons.push('Master Practitioner certification verified');
  } else {
    reasons.push('Active Level 3 Master Practitioner certification required');
  }

  if (input.deliveredLevel3OrderExists) {
    reasons.push(
      input.deliveredOrder
        ? `Level 3 delivered order ${input.deliveredOrder.orderNumber} verified`
        : 'Level 3 delivered order verified',
    );
  } else {
    reasons.push(
      'At least one delivered Level 3 white-label production order required. Complete your first Level 3 run before enrolling in Level 4.',
    );
  }

  const isEligible = input.masterCertActive && input.deliveredLevel3OrderExists;

  return {
    isEligible,
    dependencyPending: false,
    masterCertActive: input.masterCertActive,
    deliveredLevel3OrderExists: input.deliveredLevel3OrderExists,
    evidence: {
      certification: input.masterCert
        ? {
            id: input.masterCert.id,
            certifiedAt: input.masterCert.certifiedAt,
            expiresAt: input.masterCert.expiresAt,
          }
        : undefined,
      deliveredOrder: input.deliveredOrder
        ? {
            id: input.deliveredOrder.id,
            deliveredAt: input.deliveredOrder.deliveredAt,
            orderNumber: input.deliveredOrder.orderNumber,
          }
        : undefined,
    },
    reasons,
  };
}

/** DB-backed wrapper. Returns dependency_pending when the required tables
 *  do not yet exist in the database (Path A of the Prompt #97 rollout). */
export async function checkLevel4Eligibility(
  practitionerId: string,
): Promise<EligibilityResult> {
  const supabase = createClient();

  const missing = await getMissingDependencies(supabase);
  if (missing.length > 0) {
    return computeEligibility({
      masterCertActive: false,
      deliveredLevel3OrderExists: false,
      dependencyPending: true,
    });
  }

  // When dependencies are live, probe for the two evidence items. Wrapped in
  // try/catch because querying a table that doesn't exist would throw; the
  // dependency probe above should prevent that but defense in depth is cheap.
  let masterCert: EligibilityInput['masterCert'];
  let deliveredOrder: EligibilityInput['deliveredOrder'];

  try {
    const dynamic = supabase as unknown as {
      from(table: string): {
        select(
          columns: string,
        ): {
          eq(col: string, val: string): {
            eq(col: string, val: string): {
              eq(col: string, val: string): {
                maybeSingle(): Promise<{
                  data:
                    | {
                        id: string;
                        certified_at: string;
                        expires_at: string;
                      }
                    | null;
                }>;
              };
            };
          };
        };
      };
    };
    const { data: cert } = await dynamic
      .from('practitioner_certifications')
      .select('id, certified_at, expires_at, status')
      .eq('practitioner_id', practitionerId)
      .eq('certification_level_id', 'master_practitioner')
      .eq('status', 'certified')
      .maybeSingle();
    if (cert && new Date(cert.expires_at).getTime() > Date.now()) {
      masterCert = {
        id: cert.id,
        certifiedAt: cert.certified_at,
        expiresAt: cert.expires_at,
      };
    }
  } catch {
    // Table probably does not exist yet.
  }

  try {
    const dynamic = supabase as unknown as {
      from(table: string): {
        select(
          columns: string,
        ): {
          eq(col: string, val: string): {
            eq(col: string, val: string): {
              order(
                col: string,
                opts: { ascending: boolean },
              ): {
                limit(n: number): {
                  maybeSingle(): Promise<{
                    data:
                      | {
                          id: string;
                          delivered_at: string;
                          order_number: string;
                        }
                      | null;
                  }>;
                };
              };
            };
          };
        };
      };
    };
    const { data: order } = await dynamic
      .from('white_label_production_orders')
      .select('id, delivered_at, order_number')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (order) {
      deliveredOrder = {
        id: order.id,
        deliveredAt: order.delivered_at,
        orderNumber: order.order_number,
      };
    }
  } catch {
    // Table probably does not exist yet.
  }

  return computeEligibility({
    masterCertActive: !!masterCert,
    masterCert,
    deliveredLevel3OrderExists: !!deliveredOrder,
    deliveredOrder,
  });
}

/** Query information_schema to detect whether the two dependency tables
 *  are live. If either is missing, return their names so the UI knows
 *  why eligibility can't be evaluated. */
async function getMissingDependencies(
  supabase: ReturnType<typeof createClient>,
): Promise<string[]> {
  const required = ['practitioner_certifications', 'white_label_production_orders'];
  const dynamic = supabase as unknown as {
    from(table: string): {
      select(
        columns: string,
      ): {
        eq(col: string, val: string): {
          in(col: string, vals: string[]): Promise<{ data: Array<{ table_name: string }> | null }>;
        };
      };
    };
  };
  try {
    const { data } = await dynamic
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', required);
    const existing = new Set((data ?? []).map((r) => r.table_name));
    return required.filter((t) => !existing.has(t));
  } catch {
    return required;
  }
}

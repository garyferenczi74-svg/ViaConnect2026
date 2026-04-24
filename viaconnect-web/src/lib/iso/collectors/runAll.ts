// Prompt #127 P5: ISO 27001 collector registry.
//
// Separate from #122 DB_COLLECTORS and #127 P3 HIPAA_COLLECTORS so ISO
// evidence does not flow into SOC 2 or HIPAA packets. The ISO orchestrator
// (P6+) iterates this list; the cross-framework crosswalk already links
// ISO controls to SOC 2 and HIPAA equivalents via the registry.

import type { SOC2Collector } from '@/lib/soc2/collectors/types';

import { isoSoaCoverageCollector } from './soaCoverage';
import { isoRiskRegisterCollector } from './riskRegister';
import { isoInternalAuditCollector } from './internalAudit';
import { isoManagementReviewCollector } from './managementReview';
import { isoNonconformityCollector } from './nonconformity';
import { isoIsmsScopeCollector } from './ismsScope';

/** All 6 ISO 27001:2022 collectors. */
export const ISO_COLLECTORS: readonly SOC2Collector[] = [
  isoSoaCoverageCollector,
  isoRiskRegisterCollector,
  isoInternalAuditCollector,
  isoManagementReviewCollector,
  isoNonconformityCollector,
  isoIsmsScopeCollector,
];

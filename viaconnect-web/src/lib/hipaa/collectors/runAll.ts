// Prompt #127 P3: HIPAA collector registry.
//
// Separate from #122's DB_COLLECTORS so HIPAA-specific evidence doesn't
// flow into SOC 2 packets (preserving #122 backward compatibility). The
// HIPAA orchestrator (P4+) iterates this list; the cross-framework
// crosswalk in P7 links HIPAA controls to SOC 2 equivalents for shared
// evidence.

import type { SOC2Collector } from '@/lib/soc2/collectors/types';

import { hipaaBreachDeterminationsCollector } from './breach';
import { hipaaWorkforceTrainingCollector } from './workforce';
import { hipaaContingencyPlanTestCollector } from './contingency';
import { hipaaEmergencyAccessCollector } from './emergencyAccess';
import { hipaaDeviceMediaControlCollector } from './deviceMedia';

/** All 5 HIPAA-specific collectors for the HIPAA Security Rule framework. */
export const HIPAA_COLLECTORS: readonly SOC2Collector[] = [
  hipaaBreachDeterminationsCollector,
  hipaaWorkforceTrainingCollector,
  hipaaContingencyPlanTestCollector,
  hipaaEmergencyAccessCollector,
  hipaaDeviceMediaControlCollector,
];

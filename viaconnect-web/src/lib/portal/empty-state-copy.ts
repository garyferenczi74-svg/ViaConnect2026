/**
 * Practitioner and naturopath empty-state copy (PP-37, PP-38).
 * Every shopper-facing and practitioner-facing string added for these
 * pages lives here so the wording can be reviewed in one place.
 */

export interface PortalEmptyCopy {
  readonly heading: string;
  readonly title: string;
  readonly body: string;
  readonly actionLabel?: string;
}

export const PORTAL_EMPTY_COPY = {
  practitionerAi: {
    heading: "Clinical advisor",
    title: "No messages",
    body: "There are no conversations on this page.",
  },
  practitionerEhr: {
    heading: "Records",
    title: "No records",
    body: "There are no imported records on this page.",
  },
  practitionerGenomics: {
    heading: "Genomics",
    title: "No results",
    body: "There are no genetic results on this page.",
  },
  practitionerInteractions: {
    heading: "Interactions",
    title: "Interaction report",
    body: "This report lists saved interactions only.",
  },
  practitionerProtocols: {
    heading: "Protocols",
    title: "No protocols",
    body: "There are no protocols on this page.",
  },
  practitionerProtocolBuilder: {
    heading: "Protocol builder",
    title: "No protocol draft",
    body: "There is no protocol draft on this page.",
  },
  practitionerScheduler: {
    heading: "Scheduler",
    title: "No appointments",
    body: "There are no appointments on this page.",
  },
  practitionerSettings: {
    heading: "Practice settings",
    title: "No practice profile",
    body: "There is no saved practice profile on this page.",
    actionLabel: "Plugin manager",
  },
  practitionerCompliance: {
    heading: "Compliance",
    title: "No records",
    body: "There are no records on this page.",
  },
  practitionerCohorts: {
    heading: "Client cohort analysis",
    title: "No cohort data",
    body: "There is no cohort data on this page.",
    actionLabel: "Analytics",
  },
  practitionerAnalyticsCharts: {
    heading: "Analytics",
    title: "No charts",
    body: "There are no chart series on this page.",
  },
  practitionerConstitutional: {
    heading: "Constitutional assessment",
    title: "No assessment",
    body: "There is no assessment on this page.",
  },
  practitionerHolisticAdvisor: {
    heading: "Holistic advisor",
    title: "No messages",
    body: "There are no conversations on this page.",
  },
  practitionerNaturalProtocols: {
    heading: "Natural protocols",
    title: "No protocols",
    body: "There are no protocols on this page.",
  },
  naturopathAi: {
    heading: "Advisor",
    title: "No messages",
    body: "There are no conversations on this page.",
  },
  naturopathAnalytics: {
    heading: "Practice analytics",
    title: "No practice figures",
    body: "There are no practice figures on this page.",
  },
  naturopathBotanical: {
    heading: "Botanicals",
    title: "No entries",
    body: "There are no botanical entries on this page.",
  },
  naturopathFormulaBuilder: {
    heading: "Formula builder",
    title: "No formula",
    body: "There is no formula on this page.",
  },
  naturopathCompliance: {
    heading: "Compliance",
    title: "No records",
    body: "There are no records on this page.",
  },
  naturopathConstitutional: {
    heading: "Constitutional typing",
    title: "No assessment",
    body: "There is no assessment on this page.",
  },
  naturopathInteractions: {
    heading: "Interactions",
    title: "Interaction report",
    body: "This report lists saved interactions only.",
  },
  naturopathPatientDetail: {
    heading: "Patient",
    title: "No patient record",
    body: "There is no patient record on this page.",
    actionLabel: "Patient roster",
  },
  naturopathProtocols: {
    heading: "Protocols",
    title: "No protocols",
    body: "There are no protocols on this page.",
  },
  naturopathScheduler: {
    heading: "Scheduler",
    title: "No appointments",
    body: "There are no appointments on this page.",
  },
  naturopathSettings: {
    heading: "Practice settings",
    title: "No practice profile",
    body: "There is no saved practice profile on this page.",
    actionLabel: "Plugin manager",
  },
} as const satisfies Record<string, PortalEmptyCopy>;

export type PortalEmptyCopyKey = keyof typeof PORTAL_EMPTY_COPY;

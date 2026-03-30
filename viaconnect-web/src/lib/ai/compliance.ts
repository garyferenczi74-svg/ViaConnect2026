// Ultrathink Compliance Configuration — HIPAA, GDPR, GMLP

export const COMPLIANCE_CONFIG = {
  dataProcessing: {
    environment: "supabase-hipaa",
    encryption: "AES-256-GCM at rest, TLS 1.3 in transit",
    trainingDataPolicy: "synthetic_or_aggregated_only", // NEVER train on raw user PHI
    ragContainsPHI: false,
  },
  transparency: {
    trainingDataManifest: true,
    explainableOutputs: true, // "This pattern draws from Functional Medicine per Bland"
    biasAuditFrequency: "quarterly",
  },
  regulatoryPositioning: {
    classification: "wellness_support" as const,
    notMedicalDevice: true,
    notDiagnostic: true,
    gmlpCompliant: true,
    humanOversightForHighRisk: true,
  },
  userRights: {
    dataExport: true,
    dataDeletion: true,
    consentTracking: true,
    optOutOfAggregation: true,
  },
};

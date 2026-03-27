export interface ProviderConfig {
  terraName: string;
  displayName: string;
  logo: string;
  type: 'cloud' | 'mobile_sdk' | 'app';
  requiresMobileSDK: boolean;
  supportedDataTypes: string[];
  geneticContext: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  // ── Cloud Wearables (11) ──────────────────────────────────────────
  garmin: {
    terraName: 'GARMIN',
    displayName: 'Garmin',
    logo: '/logos/garmin.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'activity', 'body', 'nutrition'],
    geneticContext: 'ACTN3 power/endurance gating, CYP1A2 caffeine recovery',
  },
  oura: {
    terraName: 'OURA',
    displayName: 'Oura Ring',
    logo: '/logos/oura.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'activity', 'body'],
    geneticContext: 'CLOCK chronotype alignment, ADA sleep-depth modulation',
  },
  whoop: {
    terraName: 'WHOOP',
    displayName: 'WHOOP',
    logo: '/logos/whoop.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'activity', 'body'],
    geneticContext: 'ACTN3 strain calibration, IL6 recovery pacing',
  },
  fitbit: {
    terraName: 'FITBIT',
    displayName: 'Fitbit',
    logo: '/logos/fitbit.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'activity', 'body', 'nutrition'],
    geneticContext: 'FTO appetite-activity loop, BDNF exercise-mood linkage',
  },
  polar: {
    terraName: 'POLAR',
    displayName: 'Polar',
    logo: '/logos/polar.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'activity', 'body'],
    geneticContext: 'ACTN3 training-zone targeting, PPARGC1A endurance metrics',
  },
  coros: {
    terraName: 'COROS',
    displayName: 'COROS',
    logo: '/logos/coros.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'activity'],
    geneticContext: 'ACTN3 power/endurance split, ACE altitude adaptation',
  },
  suunto: {
    terraName: 'SUUNTO',
    displayName: 'Suunto',
    logo: '/logos/suunto.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'activity'],
    geneticContext: 'PPARGC1A VO2-max context, ACTN3 training load gating',
  },
  withings: {
    terraName: 'WITHINGS',
    displayName: 'Withings',
    logo: '/logos/withings.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['daily', 'sleep', 'body', 'nutrition'],
    geneticContext: 'FTO weight-management context, APOE cardiovascular risk',
  },
  eight_sleep: {
    terraName: 'EIGHT',
    displayName: 'Eight Sleep',
    logo: '/logos/eight_sleep.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['sleep'],
    geneticContext: 'CLOCK thermoregulation alignment, ADA sleep architecture',
  },
  libre: {
    terraName: 'FREESTYLELIBRE',
    displayName: 'FreeStyle Libre',
    logo: '/logos/libre.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['body', 'nutrition'],
    geneticContext: 'TCF7L2 glucose-response profiling, SLC30A8 insulin sensitivity',
  },
  dexcom: {
    terraName: 'DEXCOM',
    displayName: 'Dexcom',
    logo: '/logos/dexcom.svg',
    type: 'cloud',
    requiresMobileSDK: false,
    supportedDataTypes: ['body', 'nutrition'],
    geneticContext: 'TCF7L2 glycemic variability context, GCK fasting-glucose baseline',
  },

  // ── Mobile SDK (2) ────────────────────────────────────────────────
  apple_health: {
    terraName: 'APPLE',
    displayName: 'Apple Health',
    logo: '/logos/apple_health.svg',
    type: 'mobile_sdk',
    requiresMobileSDK: true,
    supportedDataTypes: ['daily', 'sleep', 'activity', 'body', 'nutrition'],
    geneticContext: 'Full genetic overlay — aggregated device data normalized',
  },
  health_connect: {
    terraName: 'GOOGLE',
    displayName: 'Health Connect',
    logo: '/logos/health_connect.svg',
    type: 'mobile_sdk',
    requiresMobileSDK: true,
    supportedDataTypes: ['daily', 'sleep', 'activity', 'body', 'nutrition'],
    geneticContext: 'Full genetic overlay — aggregated device data normalized',
  },

  // ── Apps (4) ──────────────────────────────────────────────────────
  myfitnesspal: {
    terraName: 'MYFITNESSPAL',
    displayName: 'MyFitnessPal',
    logo: '/logos/myfitnesspal.svg',
    type: 'app',
    requiresMobileSDK: false,
    supportedDataTypes: ['nutrition'],
    geneticContext: 'FTO caloric-balance context, MTHFR micronutrient flagging',
  },
  strava: {
    terraName: 'STRAVA',
    displayName: 'Strava',
    logo: '/logos/strava.svg',
    type: 'app',
    requiresMobileSDK: false,
    supportedDataTypes: ['activity'],
    geneticContext: 'ACTN3 power/endurance labeling, PPARGC1A VO2-max context',
  },
  peloton: {
    terraName: 'PELOTON',
    displayName: 'Peloton',
    logo: '/logos/peloton.svg',
    type: 'app',
    requiresMobileSDK: false,
    supportedDataTypes: ['activity'],
    geneticContext: 'ACTN3 workout-type alignment, CYP1A2 pre-workout timing',
  },
  cronometer: {
    terraName: 'CRONOMETER',
    displayName: 'Cronometer',
    logo: '/logos/cronometer.svg',
    type: 'app',
    requiresMobileSDK: false,
    supportedDataTypes: ['nutrition'],
    geneticContext: 'MTHFR micronutrient tracking, FTO macro-balance context',
  },
};

// ── Helper Functions ──────────────────────────────────────────────────

export function getProviderType(name: string): ProviderConfig['type'] | undefined {
  return PROVIDERS[name]?.type;
}

export function getProviderDisplayName(name: string): string | undefined {
  return PROVIDERS[name]?.displayName;
}

export function getProviderDataTypes(name: string): string[] | undefined {
  return PROVIDERS[name]?.supportedDataTypes;
}

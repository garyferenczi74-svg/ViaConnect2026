export type WearableProvider = 'apple_health' | 'fitbit' | 'garmin' | 'oura' | 'whoop';

export type WearableData = {
  provider: WearableProvider;
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
};

export function normalizeWearableData(_data: WearableData[]): WearableData[] {
  // Placeholder - will normalize across providers
  return _data;
}

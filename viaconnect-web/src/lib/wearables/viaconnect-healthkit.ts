import { registerPlugin, WebPlugin } from "@capacitor/core";

export interface HealthKitStepRow {
  uuid?: string;
  value?: number;
  startDate?: string;
  endDate?: string;
  sourceName?: string;
  sourceBundleId?: string;
}

export interface ViaConnectHealthKitPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(options: {
    read: string[];
    write: string[];
  }): Promise<{ granted: boolean }>;
  queryHKitSampleType(options: {
    sampleName: string;
    startDate: string;
    endDate: string;
    limit: number;
  }): Promise<{ resultData: HealthKitStepRow[] }>;
}

class ViaConnectHealthKitWeb extends WebPlugin implements ViaConnectHealthKitPlugin {
  async isAvailable(): Promise<{ available: boolean }> {
    return { available: false };
  }

  async requestAuthorization(): Promise<{ granted: boolean }> {
    return { granted: false };
  }

  async queryHKitSampleType(): Promise<{ resultData: HealthKitStepRow[] }> {
    return { resultData: [] };
  }
}

export const ViaConnectHealthKit = registerPlugin<ViaConnectHealthKitPlugin>("ViaConnectHealthKit", {
  web: () => new ViaConnectHealthKitWeb(),
});

import { describe, expect, it } from "vitest";
import { digitsFromScan } from "@/lib/native/barcode-digits";
import { readOptIn, writeOptIn, BIOMETRIC_LOCK_KEY, PUSH_OPT_IN_KEY } from "@/lib/native/device-preferences";
import { isAcceptableDeviceToken, mergeDeviceTokens } from "@/lib/native/device-tokens";
import { HEALTHKIT_STEP_COUNT_READ, normalizeStepSamples } from "@/lib/wearables/step-samples";
import { barcodeProductToMealDraft, portionGramsFromServing, readMealLookupProduct } from "@/lib/nutrition/barcode/to-meal-draft";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map.clear(); },
    getItem(key: string) { return map.has(key) ? map.get(key) ?? null : null; },
    key() { return null; },
    removeItem(key: string) { map.delete(key); },
    setItem(key: string, value: string) { map.set(key, value); },
  };
}

describe("VIA-9 device preferences", () => {
  it("defaults biometric and push opt-in off", () => {
    const storage = memoryStorage();
    expect(readOptIn(storage, BIOMETRIC_LOCK_KEY)).toBe(false);
    expect(readOptIn(storage, PUSH_OPT_IN_KEY)).toBe(false);
  });

  it("stores opt-in only as the on token", () => {
    const storage = memoryStorage();
    writeOptIn(storage, BIOMETRIC_LOCK_KEY, true);
    expect(readOptIn(storage, BIOMETRIC_LOCK_KEY)).toBe(true);
    writeOptIn(storage, BIOMETRIC_LOCK_KEY, false);
    expect(storage.getItem(BIOMETRIC_LOCK_KEY)).toBeNull();
  });
});

describe("VIA-9 device tokens", () => {
  it("rejects short and non-token strings", () => {
    expect(isAcceptableDeviceToken("short")).toBe(false);
    expect(isAcceptableDeviceToken("has spaces in the token value here")).toBe(false);
    expect(isAcceptableDeviceToken("abcDEF0123456789:_-token")).toBe(true);
  });

  it("replaces the same token and caps the list", () => {
    const first = mergeDeviceTokens([], {
      token: "a".repeat(20),
      platform: "ios",
      last_seen_at: "2026-10-03T00:00:00.000Z",
    });
    const second = mergeDeviceTokens(first, {
      token: "a".repeat(20),
      platform: "ios",
      last_seen_at: "2026-10-03T01:00:00.000Z",
    });
    expect(second).toHaveLength(1);
    expect(second[0]?.last_seen_at).toBe("2026-10-03T01:00:00.000Z");
  });
});

describe("VIA-9 step samples", () => {
  it("requests step count only", () => {
    expect([...HEALTHKIT_STEP_COUNT_READ]).toEqual(["HKQuantityTypeIdentifierStepCount"]);
  });

  it("normalizes plugin rows and drops non-objects", () => {
    const rows = normalizeStepSamples([
      { uuid: "u1", value: 1200, startDate: "2026-10-01T00:00:00.000Z", endDate: "2026-10-01T01:00:00.000Z", sourceName: "iPhone" },
      "skip",
      { quantity: 10 },
    ]);
    expect(rows[0]).toMatchObject({ id: "u1", value: 1200, sourceApp: "iPhone", type: "steps" });
    expect(rows[1]?.value).toBe(10);
    expect(rows[1]?.id).toBe("step_2");
  });
});

describe("VIA-9 barcode", () => {
  it("keeps digits from a scan string", () => {
    expect(digitsFromScan(" 0 123456789012 ")).toBe("0123456789012");
  });

  it("builds a meal draft from a lookup product without inventing a name", () => {
    expect(readMealLookupProduct({ product: { code: "1", product_name: "  " } })).toBeNull();
    const product = readMealLookupProduct({
      product: {
        code: "012345678905",
        product_name: "Example Bar",
        brands: "Example",
        serving_size: "40 g",
        nutriments: { "energy-kcal_100g": 200, proteins_100g: 10, carbohydrates_100g: 20, fat_100g: 5 },
      },
    });
    expect(product).not.toBeNull();
    if (!product) return;
    expect(portionGramsFromServing(product.serving_size)).toBe(40);
    const draft = barcodeProductToMealDraft(product, "012345678905");
    expect(draft.items[0]?.food_name).toBe("Example Bar");
    expect(draft.items[0]?.from_barcode_scan).toBe(true);
    expect(draft.items[0]?.calories_kcal).toBe(80);
    expect(draft.warnings).toEqual([]);
  });

  it("warns when required nutrients are absent", () => {
    const draft = barcodeProductToMealDraft({
      code: "012345678905",
      product_name: "Example Bar",
      brands: null,
      nutriments: null,
      serving_size: null,
      nova_group: null,
      nutriscore_grade: null,
      completeness: null,
      caffeine_per_100g_mg: null,
    }, "012345678905");
    expect(draft.warnings.length).toBe(1);
    expect(draft.items[0]?.confidence_band).toBe("low");
  });
});

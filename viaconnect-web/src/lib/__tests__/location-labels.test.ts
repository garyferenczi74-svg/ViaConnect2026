import { describe, expect, it } from "vitest";
import { subdivisionLabelForCountry } from "../location/labels";

describe("subdivisionLabelForCountry", () => {
  it("uses State for US and AU", () => {
    expect(subdivisionLabelForCountry("US")).toBe("State");
    expect(subdivisionLabelForCountry("AU")).toBe("State");
  });
  it("uses Province for CA", () => {
    expect(subdivisionLabelForCountry("CA")).toBe("Province");
  });
  it("uses Region or County elsewhere", () => {
    expect(subdivisionLabelForCountry("GB")).toBe("Region or County");
    expect(subdivisionLabelForCountry("")).toBe("Region or County");
  });
});

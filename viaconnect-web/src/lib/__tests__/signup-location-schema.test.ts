import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { signupStep3Schema } from "../location/signup-schema";

const complete = {
  fullName: "Ada Lovelace",
  phone: "5555555555",
  city: "Buffalo",
  subdivisionName: "New York",
  subdivisionCode: "US-NY",
  countryName: "United States",
  countryCode: "US",
  isFreeEntry: false,
  subdivisionOptional: false,
};

describe("signupStep3Schema", () => {
  it("accepts a complete structured location", () => {
    expect(signupStep3Schema.safeParse(complete).success).toBe(true);
  });

  it("requires countryCode min 2", () => {
    expect(signupStep3Schema.safeParse({ ...complete, countryCode: "U" }).success).toBe(
      false,
    );
    expect(signupStep3Schema.safeParse({ ...complete, countryCode: "" }).success).toBe(
      false,
    );
  });

  it("requires city min 1", () => {
    expect(signupStep3Schema.safeParse({ ...complete, city: "" }).success).toBe(false);
    expect(signupStep3Schema.safeParse({ ...complete, city: "   " }).success).toBe(
      false,
    );
  });

  it("requires subdivision unless subdivisionOptional is true", () => {
    const missing = signupStep3Schema.safeParse({
      ...complete,
      subdivisionName: null,
      subdivisionCode: null,
      subdivisionOptional: false,
    });
    expect(missing.success).toBe(false);

    const optional = signupStep3Schema.safeParse({
      ...complete,
      city: "Singapore",
      subdivisionName: null,
      subdivisionCode: null,
      countryName: "Singapore",
      countryCode: "SG",
      subdivisionOptional: true,
    });
    expect(optional.success).toBe(true);
  });

  it("still requires name and phone on step 3", () => {
    expect(signupStep3Schema.safeParse({ ...complete, fullName: "A" }).success).toBe(
      false,
    );
    expect(signupStep3Schema.safeParse({ ...complete, phone: "555" }).success).toBe(
      false,
    );
  });
});

describe("signup surfaces drop the single location input", () => {
  const signupPage = readFileSync(
    resolve(__dirname, "../../app/(auth)/signup/page.tsx"),
    "utf8",
  );

  it("does not render a #location free-text input", () => {
    expect(signupPage).not.toMatch(/id=["']location["']/);
    expect(signupPage).not.toMatch(/htmlFor=["']location["']/);
    expect(signupPage).toContain("LocationSelector");
  });

  it("sends structured metadata keys and location_legacy only", () => {
    expect(signupPage).toContain("city:");
    expect(signupPage).toContain("subdivision_name:");
    expect(signupPage).toContain("subdivision_code:");
    expect(signupPage).toContain("country_name:");
    expect(signupPage).toContain("country_code:");
    expect(signupPage).toContain("location_is_free_entry:");
    expect(signupPage).toContain("location_legacy:");
    expect(signupPage).toContain("formatStructuredLocation");
    expect(signupPage).not.toMatch(/^\s*location:\s*location/m);
  });
});

describe("ConfirmLocationBanner copy", () => {
  it("uses Hannah locked title and body verbatim", () => {
    const banner = readFileSync(
      resolve(__dirname, "../../components/location/ConfirmLocationBanner.tsx"),
      "utf8",
    );
    expect(banner).toContain("Confirm your location");
    expect(banner).toContain(
      "We could not match your saved location to a single city. Please choose your country, region, and city.",
    );
    expect(banner).not.toMatch(/\u2014|\u2013/);
  });
});

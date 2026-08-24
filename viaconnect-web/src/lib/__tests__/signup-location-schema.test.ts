import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { signupLocationMetadata, signupStep3Schema } from "../location/signup-schema";

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

  it("sends structured metadata via signupLocationMetadata helper", () => {
    expect(signupPage).toContain("signupLocationMetadata");
    expect(signupPage).toContain("...signupLocationMetadata(location)");
    expect(signupPage).not.toMatch(/^\s*location\s*:/m);
    expect(signupPage).not.toContain("location" + "_legacy");

    const schemaSource = readFileSync(
      resolve(__dirname, "../location/signup-schema.ts"),
      "utf8",
    );
    expect(schemaSource).toContain("location" + "_legacy:");
    expect(schemaSource).toContain("formatStructuredLocation");
  });
});

describe("backfill recovers missed signup location copy", () => {
  const recoverSuffix = "_prompt_223_location_backfill_recover.sql";
  const migrationsDir = resolve(__dirname, "../../../supabase/migrations");
  const recoverFile = readdirSync(migrationsDir).find((name) =>
    name.endsWith(recoverSuffix),
  );

  it("is an append-only recover migration that copies signup metadata keys", () => {
    expect(recoverFile).toBeTruthy();
    const sql = readFileSync(join(migrationsDir, recoverFile!), "utf8");
    const meta = signupLocationMetadata({
      city: "Buffalo",
      subdivisionName: "New York",
      subdivisionCode: "US-NY",
      countryName: "United States",
      countryCode: "US",
      isFreeEntry: false,
    });
    for (const key of Object.keys(meta)) {
      expect(sql).toContain(`->> '${key}'`);
    }
    expect(sql).toContain("->> 'location'");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.backfill_profile_locations()");
    expect(sql).not.toMatch(/\bUNKNOWN\b/);
    expect(sql).not.toMatch(/latitude|longitude|lat\b|lon\b|lng\b/i);
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.handle_new_user/i);
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

import { z } from "zod";
import { formatStructuredLocation } from "./format";
import type { StructuredLocation } from "./types";

export const signupLocationFieldsSchema = z
  .object({
    city: z.string().trim().min(1, "City is required"),
    countryCode: z.string().trim().min(2, "Country is required"),
    countryName: z.string().trim().min(1, "Country is required"),
    subdivisionName: z.string().nullable(),
    subdivisionCode: z.string().nullable(),
    isFreeEntry: z.boolean(),
    subdivisionOptional: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.subdivisionOptional) {
      return;
    }
    const name = data.subdivisionName?.trim() ?? "";
    const code = data.subdivisionCode?.trim() ?? "";
    if (name.length === 0 && code.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subdivisionName"],
        message: "State, province, or region is required",
      });
    }
  });

export const signupStep3Schema = signupLocationFieldsSchema.and(
  z.object({
    fullName: z.string().min(2, "Name is required"),
    phone: z.string().min(10, "Valid phone number required"),
  }),
);

export function signupLocationFieldsFromValue(
  location: StructuredLocation | null,
  subdivisionOptional: boolean,
) {
  return {
    city: location?.city ?? "",
    subdivisionName: location?.subdivisionName ?? null,
    subdivisionCode: location?.subdivisionCode ?? null,
    countryName: location?.countryName ?? "",
    countryCode: location?.countryCode ?? "",
    isFreeEntry: location?.isFreeEntry ?? false,
    subdivisionOptional,
  };
}

export function isCompleteStructuredLocation(
  location: StructuredLocation | null,
  subdivisionOptional: boolean,
): location is StructuredLocation {
  return signupLocationFieldsSchema.safeParse(
    signupLocationFieldsFromValue(location, subdivisionOptional),
  ).success;
}

export function signupLocationMetadata(location: StructuredLocation) {
  return {
    city: location.city,
    subdivision_name: location.subdivisionName,
    subdivision_code: location.subdivisionCode,
    country_name: location.countryName,
    country_code: location.countryCode,
    location_is_free_entry: location.isFreeEntry,
    location_legacy: formatStructuredLocation(location),
  };
}

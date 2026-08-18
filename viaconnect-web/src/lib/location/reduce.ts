import type { LocationOption, StructuredLocation } from "./types";

export type LocationAction =
  | { type: "setCountry"; country: LocationOption & { isFreeEntry?: boolean } }
  | {
      type: "setSubdivision";
      subdivision: LocationOption & { isFreeEntry?: boolean };
    }
  | { type: "setCity"; city: string; isFreeEntry: boolean };

const EMPTY: StructuredLocation = {
  city: "",
  subdivisionName: null,
  subdivisionCode: null,
  countryName: "",
  countryCode: "",
  isFreeEntry: false,
};

export function reduceLocationAction(
  current: StructuredLocation | null,
  action: LocationAction,
): StructuredLocation {
  const base = current ?? EMPTY;

  if (action.type === "setCountry") {
    const free = action.country.isFreeEntry === true;
    return {
      city: "",
      subdivisionName: null,
      subdivisionCode: null,
      countryName: action.country.label,
      countryCode: free ? action.country.label : action.country.value,
      isFreeEntry: free,
    };
  }

  if (action.type === "setSubdivision") {
    const free = action.subdivision.isFreeEntry === true;
    return {
      ...base,
      city: "",
      subdivisionName: action.subdivision.label,
      subdivisionCode: free ? null : action.subdivision.value,
      isFreeEntry: base.isFreeEntry || free,
    };
  }

  return {
    ...base,
    city: action.city,
    isFreeEntry: base.isFreeEntry || action.isFreeEntry,
  };
}

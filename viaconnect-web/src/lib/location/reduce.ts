import type { LocationOption, StructuredLocation } from "./types";

export type LocationAction =
  | { type: "setCountry"; country: LocationOption & { isFreeEntry?: boolean } }
  | {
      type: "setSubdivision";
      subdivision: LocationOption & { isFreeEntry?: boolean };
    }
  | { type: "setCity"; city: string; isFreeEntry: boolean };

export type LocationReduceCurrent = StructuredLocation & {
  countryIsFree?: boolean;
  subdivisionIsFree?: boolean;
};

const EMPTY: LocationReduceCurrent = {
  city: "",
  subdivisionName: null,
  subdivisionCode: null,
  countryName: "",
  countryCode: "",
  isFreeEntry: false,
};

function hasCountry(current: LocationReduceCurrent | null): boolean {
  if (!current) {
    return false;
  }
  return current.countryCode.trim() !== "" || current.countryName.trim() !== "";
}

function parentFree(current: LocationReduceCurrent): {
  countryIsFree: boolean;
  subdivisionIsFree: boolean;
} {
  return {
    countryIsFree: current.countryIsFree === true,
    subdivisionIsFree: current.subdivisionIsFree === true,
  };
}

function toStructured(
  loc: Omit<StructuredLocation, "isFreeEntry"> & { isFreeEntry: boolean },
): StructuredLocation {
  return {
    city: loc.city,
    subdivisionName: loc.subdivisionName,
    subdivisionCode: loc.subdivisionCode,
    countryName: loc.countryName,
    countryCode: loc.countryCode,
    isFreeEntry: loc.isFreeEntry,
  };
}

export function reduceLocationAction(
  current: LocationReduceCurrent | null,
  action: LocationAction,
): StructuredLocation | null {
  if (action.type === "setCountry") {
    const free = action.country.isFreeEntry === true;
    return toStructured({
      city: "",
      subdivisionName: null,
      subdivisionCode: null,
      countryName: action.country.label,
      countryCode: free ? action.country.label : action.country.value,
      isFreeEntry: free,
    });
  }

  const base = current ?? EMPTY;
  if (!hasCountry(base)) {
    return null;
  }

  const { countryIsFree, subdivisionIsFree } = parentFree(base);

  if (action.type === "setSubdivision") {
    const free = action.subdivision.isFreeEntry === true;
    return toStructured({
      city: "",
      subdivisionName: action.subdivision.label,
      subdivisionCode: free ? null : action.subdivision.value,
      countryName: base.countryName,
      countryCode: base.countryCode,
      isFreeEntry: countryIsFree || free,
    });
  }

  return toStructured({
    city: action.city,
    subdivisionName: base.subdivisionName,
    subdivisionCode: base.subdivisionCode,
    countryName: base.countryName,
    countryCode: base.countryCode,
    isFreeEntry: countryIsFree || subdivisionIsFree || action.isFreeEntry,
  });
}

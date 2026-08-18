export type StructuredLocation = {
  city: string;
  subdivisionName: string | null;
  subdivisionCode: string | null;
  countryName: string;
  countryCode: string;
  isFreeEntry: boolean;
};

export type LocationOption = { value: string; label: string };

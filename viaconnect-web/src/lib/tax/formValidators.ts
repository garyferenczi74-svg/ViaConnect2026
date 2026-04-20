// Prompt #102 Workstream B — tax form PII-shape validators (pure).
//
// These validate the SHAPE of the practitioner-entered values BEFORE
// they are written to Vault-encrypted storage. Format rules only;
// actual ID-number validation (e.g., SSN checksum) is out of scope.

export type TaxFormType = 'w9' | 'w8ben' | 'w8bene' | 't4a_registration';

export type TaxFormValidationError =
  | 'LEGAL_NAME_REQUIRED'
  | 'SSN_FORMAT_INVALID'
  | 'EIN_FORMAT_INVALID'
  | 'ITIN_FORMAT_INVALID'
  | 'SIN_FORMAT_INVALID'
  | 'BN_FORMAT_INVALID'
  | 'ADDRESS_REQUIRED'
  | 'COUNTRY_REQUIRED';

const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$/;
const EIN_REGEX = /^\d{2}-\d{7}$/;
const ITIN_REGEX = /^9\d{2}-(7[0-9]|8[0-8]|9[0-2]|9[4-9])-\d{4}$/;
const SIN_REGEX = /^\d{3}-\d{3}-\d{3}$/;
const BN_REGEX = /^\d{9}(RT\d{4}|RP\d{4}|[A-Z]{2}\d{4})?$/;

export interface W9Input {
  legalName: string;
  ssnOrEin: string;
  idKind: 'ssn' | 'ein';
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}

export function validateW9(input: W9Input): TaxFormValidationError | null {
  if (input.legalName.trim().length < 2) return 'LEGAL_NAME_REQUIRED';
  if (input.idKind === 'ssn' && !SSN_REGEX.test(input.ssnOrEin)) return 'SSN_FORMAT_INVALID';
  if (input.idKind === 'ein' && !EIN_REGEX.test(input.ssnOrEin)) return 'EIN_FORMAT_INVALID';
  if (input.addressLine1.trim().length < 3 || input.city.trim().length < 2) return 'ADDRESS_REQUIRED';
  return null;
}

export interface W8BENInput {
  legalName: string;
  foreignTaxId: string;
  countryOfResidence: string;
  permanentAddress: string;
}

export function validateW8BEN(input: W8BENInput): TaxFormValidationError | null {
  if (input.legalName.trim().length < 2) return 'LEGAL_NAME_REQUIRED';
  if (input.countryOfResidence.trim().length !== 2) return 'COUNTRY_REQUIRED';
  if (input.permanentAddress.trim().length < 5) return 'ADDRESS_REQUIRED';
  // foreignTaxId format is country-specific; we accept any non-empty alnum.
  if (!/^[A-Za-z0-9\- ]{4,30}$/.test(input.foreignTaxId.trim())) return 'ITIN_FORMAT_INVALID';
  return null;
}

export interface W8BENEInput extends W8BENInput {
  entityName: string;
}

export function validateW8BENE(input: W8BENEInput): TaxFormValidationError | null {
  if (input.entityName.trim().length < 2) return 'LEGAL_NAME_REQUIRED';
  return validateW8BEN(input);
}

export interface T4AInput {
  legalName: string;
  sinOrBn: string;
  idKind: 'sin' | 'bn';
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
}

export function validateT4A(input: T4AInput): TaxFormValidationError | null {
  if (input.legalName.trim().length < 2) return 'LEGAL_NAME_REQUIRED';
  if (input.idKind === 'sin' && !SIN_REGEX.test(input.sinOrBn)) return 'SIN_FORMAT_INVALID';
  if (input.idKind === 'bn' && !BN_REGEX.test(input.sinOrBn)) return 'BN_FORMAT_INVALID';
  if (input.addressLine1.trim().length < 3 || input.city.trim().length < 2) return 'ADDRESS_REQUIRED';
  return null;
}

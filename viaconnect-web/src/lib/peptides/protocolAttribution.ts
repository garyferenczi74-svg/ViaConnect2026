/**
 * Prompt 226 Module B: Lex-controlled attribution (Section 6.3).
 * Not editable by the practitioner.
 */

export const PROTOCOL_ATTRIBUTION_VERSION = '226-b-v1';

export const PROTOCOL_ATTRIBUTION_TEMPLATE =
  'This regimen was specified by {practitionerName}, licence {licenseNumber} ({jurisdiction}). ' +
  'ViaConnect performed the unit conversion only and is not the source of clinical judgement. ' +
  'Educational conversion support only; not a substitute for the prescribing relationship.';

export function formatProtocolAttribution(input: {
  practitionerName: string;
  licenseNumber: string;
  jurisdiction: string;
}): string {
  return PROTOCOL_ATTRIBUTION_TEMPLATE.replace(
    '{practitionerName}',
    input.practitionerName.trim() || 'the prescribing practitioner',
  )
    .replace('{licenseNumber}', input.licenseNumber.trim() || 'on file')
    .replace('{jurisdiction}', input.jurisdiction.trim() || 'jurisdiction on file');
}

// Prompt #102 Workstream A — manual document upload rules.

export type ManualEvidenceType =
  | 'business_license'
  | 'clinic_lease'
  | 'distribution_agreement'
  | 'pop_up_event_permit'
  | 'other';

export const MAX_DOCUMENTS_PER_CHANNEL = 5;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export type ManualUploadValidationError =
  | 'TOO_MANY_DOCUMENTS'
  | 'DOCUMENT_TOO_LARGE'
  | 'UNSUPPORTED_MIME_TYPE'
  | 'EMPTY_UPLOAD';

export function validateManualUpload(
  files: ReadonlyArray<{ size: number; type: string }>,
): ManualUploadValidationError | null {
  if (files.length === 0) return 'EMPTY_UPLOAD';
  if (files.length > MAX_DOCUMENTS_PER_CHANNEL) return 'TOO_MANY_DOCUMENTS';
  for (const f of files) {
    if (f.size > MAX_DOCUMENT_BYTES) return 'DOCUMENT_TOO_LARGE';
    if (!ALLOWED_MIME_TYPES.includes(f.type)) return 'UNSUPPORTED_MIME_TYPE';
  }
  return null;
}

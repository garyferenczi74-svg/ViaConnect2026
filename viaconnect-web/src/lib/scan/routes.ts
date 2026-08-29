// Prompt 231: single source for the capture route (G79, no /scan alias).
export const SCAN_CAPTURE_PATH = '/body-tracker/formavision/scan';

export function scanResultPath(scanId: string): string {
  return `${SCAN_CAPTURE_PATH}/${scanId}`;
}

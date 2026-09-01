// Prompt 210k: pure navigation helpers for the composition / FormaVision section.
// Keeps tab URLs, scan deep links, and post-scan landing paths unit-testable.

export type CompositionContentSection = 'fat' | 'muscle' | 'measurements';

export const COMPOSITION_PATH = '/body-tracker/composition';
export const FORMAVISION_PATH = '/body-tracker/formavision';

/** Canonical composition URL for a content tab (shareable, back-button safe). */
export function compositionSectionHref(section: CompositionContentSection): string {
  return `${COMPOSITION_PATH}?section=${section}`;
}

/** Open the composition surface with the Scan My Body panel expanded. */
export function compositionScanHref(): string {
  return `${COMPOSITION_PATH}?scan=1`;
}

/** After a successful scan persist, land on the FormaVision 3D surface (210h Rev C). */
export function formavisionAfterScanHref(): string {
  return FORMAVISION_PATH;
}

/** Live 4-pose camera capture (Prompt 231). */
export function formavisionLiveScanHref(): string {
  return `${FORMAVISION_PATH}/scan`;
}

export type FormaVisionScanMode = 'live' | 'upload';

/** Open the FormaVision scan panel with a mode (default upload). */
export function formavisionScanEntryHref(
  mode: FormaVisionScanMode = 'upload',
): string {
  return `${FORMAVISION_PATH}?mode=${mode}`;
}

/** Open FormaVision scan panel in Upload saved images mode. */
export function formavisionUploadHref(): string {
  return formavisionScanEntryHref('upload');
}

export function parseFormaVisionScanMode(
  raw: string | null | undefined,
): FormaVisionScanMode | null {
  if (raw === 'live' || raw === 'upload') return raw;
  return null;
}

export function parseCompositionSection(
  raw: string | null | undefined,
): CompositionContentSection | null {
  if (raw === 'fat' || raw === 'muscle' || raw === 'measurements') return raw;
  return null;
}

export function shouldOpenScanFromQuery(raw: string | null | undefined): boolean {
  return raw === '1' || raw === 'true';
}

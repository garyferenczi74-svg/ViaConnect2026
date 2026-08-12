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

export function parseCompositionSection(
  raw: string | null | undefined,
): CompositionContentSection | null {
  if (raw === 'fat' || raw === 'muscle' || raw === 'measurements') return raw;
  return null;
}

export function shouldOpenScanFromQuery(raw: string | null | undefined): boolean {
  return raw === '1' || raw === 'true';
}

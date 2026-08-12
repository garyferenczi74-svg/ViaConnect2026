// Prompt 210k: composition / FormaVision navigation wiring contracts.
import { describe, it, expect } from 'vitest';
import {
  COMPOSITION_PATH,
  FORMAVISION_PATH,
  compositionSectionHref,
  compositionScanHref,
  formavisionAfterScanHref,
  parseCompositionSection,
  shouldOpenScanFromQuery,
} from '../compositionNav';

describe('compositionNav (210k)', () => {
  it('builds shareable section URLs for each content tab', () => {
    expect(compositionSectionHref('fat')).toBe(`${COMPOSITION_PATH}?section=fat`);
    expect(compositionSectionHref('muscle')).toBe(`${COMPOSITION_PATH}?section=muscle`);
    expect(compositionSectionHref('measurements')).toBe(
      `${COMPOSITION_PATH}?section=measurements`,
    );
  });

  it('deep-links Scan My Body into the composition scan panel', () => {
    expect(compositionScanHref()).toBe(`${COMPOSITION_PATH}?scan=1`);
  });

  it('lands completed scans on the FormaVision surface', () => {
    expect(formavisionAfterScanHref()).toBe(FORMAVISION_PATH);
  });

  it('parses only known composition section query values', () => {
    expect(parseCompositionSection('fat')).toBe('fat');
    expect(parseCompositionSection('muscle')).toBe('muscle');
    expect(parseCompositionSection('measurements')).toBe('measurements');
    expect(parseCompositionSection('formavision')).toBeNull();
    expect(parseCompositionSection(null)).toBeNull();
    expect(parseCompositionSection('')).toBeNull();
  });

  it('opens scan only for explicit scan query flags', () => {
    expect(shouldOpenScanFromQuery('1')).toBe(true);
    expect(shouldOpenScanFromQuery('true')).toBe(true);
    expect(shouldOpenScanFromQuery('0')).toBe(false);
    expect(shouldOpenScanFromQuery(null)).toBe(false);
  });
});

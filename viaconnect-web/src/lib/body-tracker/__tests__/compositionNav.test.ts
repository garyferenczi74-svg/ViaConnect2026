// Prompt 210k: composition / FormaVision navigation wiring contracts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  COMPOSITION_PATH,
  FORMAVISION_PATH,
  compositionSectionHref,
  compositionScanHref,
  formavisionAfterScanHref,
  formavisionLiveScanHref,
  formavisionScanEntryHref,
  formavisionUploadHref,
  parseCompositionSection,
  parseFormaVisionScanMode,
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

  it('points live capture at the 4-pose scan route', () => {
    expect(formavisionLiveScanHref()).toBe(`${FORMAVISION_PATH}/scan`);
    expect(parseFormaVisionScanMode('upload')).toBe('upload');
    expect(parseFormaVisionScanMode('live')).toBe('live');
    expect(parseFormaVisionScanMode('compare')).toBeNull();
  });

  it('opens the FormaVision scan panel in upload mode', () => {
    expect(formavisionScanEntryHref()).toBe(`${FORMAVISION_PATH}?mode=upload`);
    expect(formavisionScanEntryHref('upload')).toBe(`${FORMAVISION_PATH}?mode=upload`);
    expect(formavisionScanEntryHref('live')).toBe(`${FORMAVISION_PATH}?mode=live`);
    expect(formavisionUploadHref()).toBe(formavisionScanEntryHref('upload'));
    expect(parseFormaVisionScanMode(new URL(formavisionUploadHref(), 'https://app.local').searchParams.get('mode'))).toBe(
      'upload',
    );
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

  it('dashboard Body Composition tile enters FormaVision upload mode, not /scan', () => {
    const root = process.cwd();
    const dash = readFileSync(
      join(root, 'src/components/body-tracker/dashboard/DashboardBento.tsx'),
      'utf8',
    );
    const composition = readFileSync(
      join(root, 'src/app/(app)/(consumer)/body-tracker/composition/page.tsx'),
      'utf8',
    );
    const row = readFileSync(
      join(root, 'src/components/body-tracker/BiologyActionRow.tsx'),
      'utf8',
    );
    expect(dash).toContain("formavisionScanEntryHref('upload')");
    expect(dash).not.toContain('SCAN_CAPTURE_PATH');
    expect(composition).not.toContain('formavisionScanEntryHref');
    expect(composition).not.toContain('SCAN_CAPTURE_PATH');
    expect(composition).not.toContain('biology-action-formavision');
    expect(composition).toContain('BodyScanUploader');
    expect(composition).toContain('CompositionSectionToggle');
    expect(row).not.toContain('biology-action-formavision');
    expect(row).not.toMatch(/>FormaVision</);
  });
});

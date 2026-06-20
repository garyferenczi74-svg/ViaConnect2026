// Prompt 191 Task E (2026-06-12): source as text contract tests for the My
// Genetics bento hub. Same convention the other genetics + nutrition hub tests
// use (readFileSync + assert on the source); full visual sign off happens at
// the Vercel preview. These lock the composition of every Task A to D piece,
// the grid container, the desktop asymmetric spans (hero 4 wide / 2 tall, Your
// Variants full width), the lg:order desktop rearrange classes, the reuse of
// the body-tracker AssessmentRetakeCard, the client posture, and the no dash
// rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const HUB = path.resolve(__dirname, '..', 'GeneticsHub.tsx');

describe('GeneticsHub source', () => {
  const source = readFileSync(HUB, 'utf-8');

  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('composes the header and the getting started strip', () => {
    expect(source).toContain("import { GeneticsHubHeader } from './GeneticsHubHeader'");
    expect(source).toContain('<GeneticsHubHeader />');
    expect(source).toContain(
      "import { GeneticsGettingStartedStrip } from './GeneticsGettingStartedStrip'",
    );
    expect(source).toContain('<GeneticsGettingStartedStrip />');
  });

  it('composes the blueprint bento (Prompt 193d, replaces the single hero card)', () => {
    expect(source).toContain(
      "import { GeneticBlueprintBento } from './GeneticBlueprintBento'",
    );
    expect(source).toContain('<GeneticBlueprintBento');
  });

  it('composes all four action cards from GeneticsActionCards', () => {
    expect(source).toContain("} from './GeneticsActionCards'");
    expect(source).toContain('UploadDnaCard');
    expect(source).toContain('UploadLabCard');
    expect(source).toContain('SnpFormulationsCard');
    expect(source).toContain('OrderPanelsCard');
    expect(source).toContain('<UploadDnaCard');
    expect(source).toContain('<UploadLabCard');
    expect(source).toContain('<SnpFormulationsCard');
    expect(source).toContain('<OrderPanelsCard');
  });

  it('composes the Your Variants card', () => {
    expect(source).toContain("import { YourVariantsCard } from './YourVariantsCard'");
    expect(source).toContain('<YourVariantsCard');
  });

  it('reuses the body-tracker AssessmentRetakeCard unchanged', () => {
    expect(source).toContain(
      "import { AssessmentRetakeCard } from '@/components/body-tracker/hub/AssessmentRetakeCard'",
    );
    expect(source).toContain('<AssessmentRetakeCard />');
  });

  it('uses the standard max-w-7xl container with Instrument Sans', () => {
    expect(source).toContain(
      'mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8 font-[Instrument_Sans]',
    );
  });

  it('lays the bento out on a twelve column lg grid', () => {
    expect(source).toContain('grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12');
  });

  it('makes the blueprint bento and Your Variants full width bands on the desktop grid', () => {
    expect(source).toContain('<GeneticBlueprintBento className="md:col-span-2 lg:col-span-12" />');
    // Prompt 204i: Your Variants is wrapped in the #your-variants anchor target
    // (for the Blueprint back control), which carries the full-width grid span.
    expect(source).toContain('id="your-variants"');
    expect(source).toContain('scroll-mt-24 md:col-span-2 lg:col-span-12');
    expect(source).toContain('<YourVariantsCard />');
  });

  it('makes the four action cards a single four across row on the desktop grid', () => {
    expect(source).toContain('<UploadDnaCard className="md:col-span-1 lg:col-span-3" />');
    expect(source).toContain('<UploadLabCard className="md:col-span-1 lg:col-span-3" />');
    expect(source).toContain('<SnpFormulationsCard className="md:col-span-1 lg:col-span-3" />');
    expect(source).toContain('<OrderPanelsCard className="md:col-span-1 lg:col-span-3" />');
  });

  it('carries no lg:order classes (source order matches the desktop order)', () => {
    expect(source).not.toContain('lg:order-');
  });

  it('opens no write path: no inserts, updates, deletes, or fetches', () => {
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
    expect(source).not.toContain('.upsert(');
    expect(source).not.toContain('fetch(');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

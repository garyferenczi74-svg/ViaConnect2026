import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { selectPlateMeshSource } from '../selectPlateMeshSource';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Ready plate prefers stored Meshy GLB over Picasso', () => {
  it('selectPlateMeshSource never names Picasso', () => {
    expect(selectPlateMeshSource.toString()).not.toMatch(/picasso/i);
  });

  it('FormaVisionCanvas loads our signed GLB and does not import Picasso', () => {
    const canvas = read('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toContain('MeshyGlbMesh');
    expect(canvas).toContain('meshyGlbUrl');
    expect(canvas).toContain('selectPlateMeshSource');
    expect(canvas).not.toMatch(/picassoPackSrc/);
    expect(canvas).not.toMatch(/formavision\/picasso/);
    expect(canvas).not.toMatch(/api\.meshy\.ai/);
  });

  it('BodyCompositionAvatar forwards the stored GLB and never Picasso', () => {
    const avatar = read('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(avatar).toContain('meshyGlbUrl');
    expect(avatar).not.toMatch(/picassoPackSrc/);
    expect(avatar).not.toMatch(/formavision\/picasso/);
  });

  it('client hook requests our GLB route, never Meshy from the browser', () => {
    const hook = read('src/hooks/formavision/useMeshyVisual.ts');
    expect(hook).toContain('/api/formavision/meshy/glb');
    expect(hook).not.toMatch(/api\.meshy\.ai/);
    expect(hook).not.toMatch(/NEXT_PUBLIC_MESHY/);
  });
});

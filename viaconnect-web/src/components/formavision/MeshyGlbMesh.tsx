'use client';

import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, Vector3 } from 'three';
import { computeFitTransform, resolveVisualHeightM } from '@/lib/formavision/meshy/fitGlbToHeight';

export interface MeshyGlbMeshProps {
  url: string;
  heightCm?: number | null;
  visible?: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}

export function MeshyGlbMesh({
  url,
  heightCm = null,
  visible = true,
  onReady,
  onError,
}: MeshyGlbMeshProps) {
  const gltf = useGLTF(url);
  const invalidate = useThree((state) => state.invalidate);

  const fit = useMemo(() => {
    const box = new Box3().setFromObject(gltf.scene);
    const min = box.min;
    const max = box.max;
    if (!Number.isFinite(min.x) || !Number.isFinite(max.y)) {
      return { scale: 1, position: [0, 0, 0] as const };
    }
    return computeFitTransform(
      { min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] },
      resolveVisualHeightM(heightCm),
    );
  }, [gltf.scene, heightCm]);

  useEffect(() => {
    try {
      const size = new Vector3();
      new Box3().setFromObject(gltf.scene).getSize(size);
      if (size.length() < 0.01) {
        onError?.(new Error('meshy_glb_empty'));
        return;
      }
      onReady?.();
      invalidate();
    } catch (error) {
      onError?.(error);
    }
  }, [gltf.scene, invalidate, onError, onReady]);

  return (
    <group
      visible={visible}
      scale={fit.scale}
      position={[fit.position[0], fit.position[1], fit.position[2]]}
    >
      <primitive object={gltf.scene} />
    </group>
  );
}

export default MeshyGlbMesh;

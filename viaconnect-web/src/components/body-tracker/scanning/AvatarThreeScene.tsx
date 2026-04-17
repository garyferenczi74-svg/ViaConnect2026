'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { AvatarSegmentSpec } from '@/lib/arnold/scanning/avatarMeshGenerator';
import { segmentColor } from '@/lib/arnold/scanning/avatarMeshGenerator';

interface AvatarThreeSceneProps {
  segments: AvatarSegmentSpec[];
  bodyFatPct: number;
  viewPreset: 'free' | 'front' | 'back' | 'left' | 'right';
  visualization: 'solid' | 'wireframe' | 'heatmap';
}

const BASE_COLOR = '#2DA5A0';

export function AvatarThreeScene({ segments, bodyFatPct, viewPreset, visualization }: AvatarThreeSceneProps) {
  const cameraPosition = useMemo<[number, number, number]>(() => {
    switch (viewPreset) {
      case 'front': return [0, 0, 30];
      case 'back':  return [0, 0, -30];
      case 'left':  return [-30, 0, 0];
      case 'right': return [30, 0, 0];
      default:      return [22, 8, 22];
    }
  }, [viewPreset]);

  const enableOrbit = viewPreset === 'free';

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 25, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0B1520']} />
      <ambientLight intensity={0.6} color={new THREE.Color('#d7e6ff')} />
      <directionalLight position={[6, 10, 8]} intensity={0.9} color={new THREE.Color('#ffffff')} />
      <directionalLight position={[-6, 4, -8]} intensity={0.35} color={new THREE.Color('#cfd8ff')} />
      <pointLight position={[0, -6, 8]} intensity={0.2} />

      <group>
        {segments.map((seg, i) => (
          <AvatarSegment
            key={i}
            segment={seg}
            color={segmentColor(seg, bodyFatPct, visualization === 'heatmap')}
            baseColor={BASE_COLOR}
            wireframe={visualization === 'wireframe'}
          />
        ))}
      </group>

      {enableOrbit && (
        <OrbitControls
          enablePan={false}
          minDistance={15}
          maxDistance={40}
          enableDamping
          dampingFactor={0.08}
          target={[0, -1, 0]}
        />
      )}
    </Canvas>
  );
}

function AvatarSegment({ segment, color, baseColor, wireframe }: { segment: AvatarSegmentSpec; color: string; baseColor: string; wireframe: boolean }) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color || baseColor),
        roughness: 0.78,
        metalness: 0.08,
        wireframe,
        transparent: true,
        opacity: wireframe ? 0.6 : 0.96,
      }),
    [color, baseColor, wireframe],
  );

  const geometry = useMemo(() => {
    const [rx, ry, rz] = segment.radii;
    switch (segment.kind) {
      case 'head': {
        const g = new THREE.SphereGeometry(1, 24, 16);
        g.scale(rx, ry, rz);
        return g;
      }
      case 'torso': {
        const g = new THREE.SphereGeometry(1, 24, 16);
        g.scale(rx, ry, rz);
        return g;
      }
      case 'neck':
      case 'upper_arm':
      case 'forearm':
      case 'thigh':
      case 'calf': {
        const g = new THREE.CylinderGeometry(rx, ry, rz * 2, 18, 1);
        return g;
      }
      case 'joint':
      case 'hand':
      case 'foot':
      default: {
        const g = new THREE.SphereGeometry(1, 16, 12);
        g.scale(rx, ry, rz);
        return g;
      }
    }
  }, [segment]);

  return (
    <mesh
      position={segment.position}
      rotation={segment.rotation}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  );
}

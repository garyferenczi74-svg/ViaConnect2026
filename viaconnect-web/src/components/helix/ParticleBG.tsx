'use client';

import { useMemo } from 'react';

const PARTICLE_COUNT = 18;
const COLORS = ['#2DA5A0', '#B75E18', 'rgba(255,255,255,0.4)'];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export function ParticleBG() {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 2,
      color: COLORS[i % 3],
      duration: Math.random() * 15 + 8,
      delay: Math.random() * 8,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Page gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(170deg, #0d1520 0%, #1A2744 30%, #0f1d33 60%, #1A2744 100%)',
        }}
      />

      {/* Ambient blob - top right teal */}
      <div
        className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(45,165,160,0.3) 0%, transparent 70%)',
        }}
      />

      {/* Ambient blob - bottom left orange */}
      <div
        className="absolute -bottom-[150px] -left-[150px] w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(183,94,24,0.25) 0%, transparent 70%)',
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

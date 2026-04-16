'use client';

import type { PoseId } from '@/lib/arnold/types';

interface SilhouetteOverlayProps {
  pose: PoseId;
  className?: string;
}

const VIEWBOX = '0 0 200 500';
const STROKE = 'rgba(45, 165, 160, 0.55)';
const FILL = 'rgba(45, 165, 160, 0.05)';

export function SilhouetteOverlay({ pose, className = '' }: SilhouetteOverlayProps) {
  return (
    <svg
      aria-hidden
      viewBox={VIEWBOX}
      className={`pointer-events-none ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g fill={FILL} stroke={STROKE} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        {pose === 'front' && <FrontPath />}
        {pose === 'back'  && <BackPath />}
        {pose === 'left'  && <LeftPath />}
        {pose === 'right' && <RightPath />}
      </g>
    </svg>
  );
}

function FrontPath() {
  return (
    <>
      {/* head */}
      <ellipse cx="100" cy="45" rx="22" ry="28" />
      {/* neck */}
      <path d="M88,73 L112,73 L110,88 L90,88 Z" />
      {/* torso + arms slightly out */}
      <path d="M70,90 L130,90 L145,110 L150,190 L135,210 L130,240 L128,310 L72,310 L70,240 L65,210 L50,190 L55,110 Z" />
      {/* legs */}
      <path d="M75,310 L95,310 L98,400 L95,480 L80,480 L72,400 Z" />
      <path d="M125,310 L105,310 L102,400 L105,480 L120,480 L128,400 Z" />
    </>
  );
}

function BackPath() {
  return (
    <>
      <ellipse cx="100" cy="45" rx="22" ry="28" />
      <path d="M88,73 L112,73 L110,88 L90,88 Z" />
      <path d="M70,90 L130,90 L145,110 L150,190 L135,210 L130,240 L128,310 L72,310 L70,240 L65,210 L50,190 L55,110 Z" />
      <path d="M75,310 L95,310 L98,400 L95,480 L80,480 L72,400 Z" />
      <path d="M125,310 L105,310 L102,400 L105,480 L120,480 L128,400 Z" />
      {/* centerline suggesting spine */}
      <path d="M100,92 L100,308" strokeDasharray="3,4" />
    </>
  );
}

function LeftPath() {
  return (
    <>
      {/* head */}
      <ellipse cx="100" cy="45" rx="20" ry="28" />
      <path d="M95,73 L110,73 L108,88 L92,88 Z" />
      {/* torso side profile, chest forward and glute back */}
      <path d="M80,90 L118,90 L122,120 L118,160 L120,200 L115,240 L112,310 L82,310 L80,240 L78,200 L78,160 L82,120 Z" />
      {/* arm at side */}
      <path d="M78,100 L70,180 L78,250" fill="none" />
      {/* legs combined as one side silhouette */}
      <path d="M85,310 L115,310 L118,400 L112,480 L88,480 L82,400 Z" />
    </>
  );
}

function RightPath() {
  return (
    <>
      <ellipse cx="100" cy="45" rx="20" ry="28" />
      <path d="M90,73 L105,73 L108,88 L92,88 Z" />
      <path d="M82,90 L120,90 L118,120 L122,160 L120,200 L125,240 L118,310 L88,310 L82,240 L80,200 L80,160 L78,120 Z" />
      <path d="M122,100 L130,180 L122,250" fill="none" />
      <path d="M85,310 L115,310 L118,400 L112,480 L88,480 L82,400 Z" />
    </>
  );
}

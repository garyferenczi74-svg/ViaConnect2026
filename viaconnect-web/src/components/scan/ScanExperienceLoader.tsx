'use client';

/**
 * Prompt 231: dynamic(..., { ssr:false }) must be called from a Client
 * Component in the current App Router (a Server Component throws "Please
 * move it into a client component"). This thin wrapper is that client
 * boundary; the route's page.tsx stays a server component that does the
 * height/consent reads and renders this.
 */
import dynamic from 'next/dynamic';
import type { ScanExperienceProps } from './ScanExperience';

const ScanExperience = dynamic(() => import('./ScanExperience').then((m) => m.ScanExperience), {
  ssr: false,
});

export function ScanExperienceLoader(props: ScanExperienceProps) {
  return <ScanExperience {...props} />;
}

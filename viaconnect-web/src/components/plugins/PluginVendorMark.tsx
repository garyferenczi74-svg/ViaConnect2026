'use client';

/**
 * Official identification marks for /plugins registry rows only.
 * Original SVG drawings for nominative identification. Lucide 1.5 fallback
 * for unknown slugs. No Whoop / Oura / Hume / Apple marks.
 */

import { useId } from 'react';
import { Plug } from 'lucide-react';

export const PLUGIN_VENDOR_MARK_SLUGS = [
  'google_health',
  'myfitnesspal',
  'cronometer',
  'strava',
  'peloton',
  'headspace',
  'calm',
] as const;

export type PluginVendorMarkSlug = (typeof PLUGIN_VENDOR_MARK_SLUGS)[number];

const TILE = 'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl';

function GoogleHealthMark({ title }: { title: string }) {
  const gid = useId();
  return (
    <span className={`${TILE} bg-white`} data-vendor-mark="google_health">
      <svg viewBox="0 0 48 48" className="h-10 w-10" role="img" aria-label={title}>
        <defs>
          <linearGradient id={gid} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4285F4" />
            <stop offset="0.32" stopColor="#EA4335" />
            <stop offset="0.64" stopColor="#FBBC04" />
            <stop offset="1" stopColor="#34A853" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gid})`}
          d="M24 41.6S7.2 30.6 7.2 19.4C7.2 13.2 12 8.8 17.8 8.8c3.5 0 6.6 1.8 8.2 4.6 1.6-2.8 4.7-4.6 8.2-4.6 5.8 0 10.6 4.4 10.6 10.6 0 11.2-16.8 22.2-16.8 22.2z"
        />
      </svg>
    </span>
  );
}

function MyFitnessPalMark({ title }: { title: string }) {
  return (
    <span className={`${TILE} bg-[#0070E0] px-1`} data-vendor-mark="myfitnesspal">
      <svg viewBox="0 0 56 56" className="h-12 w-12" role="img" aria-label={title}>
        <text
          x="28"
          y="24"
          textAnchor="middle"
          fill="#fff"
          fontSize="8"
          fontFamily="Instrument Sans, Inter, system-ui, sans-serif"
          fontWeight="700"
        >
          myfitness
        </text>
        <text
          x="28"
          y="36"
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
          fontFamily="Instrument Sans, Inter, system-ui, sans-serif"
          fontWeight="700"
        >
          pal
        </text>
      </svg>
    </span>
  );
}

function CronometerMark({ title }: { title: string }) {
  return (
    <span className={`${TILE} bg-[#5B8C3E]`} data-vendor-mark="cronometer">
      <svg viewBox="0 0 48 48" className="h-10 w-10" role="img" aria-label={title}>
        <path
          fill="#fff"
          d="M24.8 8.4c.2 2.4-1.4 4.6-3.6 5.2-1.8-2.2-.8-4.8 1.2-6.2 1-.7 2.2.2 2.4 1z"
        />
        <path
          fill="#fff"
          d="M24 14.2c6.8 0 12.2 5.6 12.2 13.2 0 7.2-5 12.8-12.2 12.8S11.8 34.6 11.8 27.4c0-7.6 5.4-13.2 12.2-13.2z"
        />
      </svg>
    </span>
  );
}

function StravaMark({ title }: { title: string }) {
  return (
    <span className={`${TILE} bg-[#FC4C02]`} data-vendor-mark="strava">
      <svg viewBox="0 0 24 24" className="h-9 w-9" role="img" aria-label={title}>
        <path fill="#fff" d="M13.6 2.2 6.4 16.2h4.2l3-6.2 3 6.2h4.2L15.6 2.2z" />
        <path fill="#fff" fillOpacity="0.72" d="m10.4 16.2-2.2 4.6h4.2l2.2-4.6z" />
      </svg>
    </span>
  );
}

function PelotonMark({ title }: { title: string }) {
  return (
    <span className={`${TILE} bg-[#C8102E]`} data-vendor-mark="peloton">
      <svg viewBox="0 0 48 48" className="h-9 w-9" role="img" aria-label={title}>
        <path
          fill="#fff"
          d="M16.4 10.4h10.2c6.2 0 10.4 3.8 10.4 9.6 0 5.6-4.2 9.4-10.4 9.4H22.6V37.6h-6.2V10.4zm6.2 13.2h3.8c2.8 0 4.4-1.6 4.4-4 0-2.4-1.6-4-4.4-4h-3.8v8z"
        />
      </svg>
    </span>
  );
}

function HeadspaceMark({ title }: { title: string }) {
  return (
    <span className={`${TILE} bg-[#FF8A4C]`} data-vendor-mark="headspace">
      <svg viewBox="0 0 48 48" className="h-10 w-10" role="img" aria-label={title}>
        <circle cx="24" cy="24" r="14" fill="#fff" />
        <circle cx="18.6" cy="21.4" r="2.2" fill="#FF8A4C" />
        <circle cx="29.4" cy="21.4" r="2.2" fill="#FF8A4C" />
        <path
          d="M18.8 28.2c1.6 2.2 4 3.4 5.2 3.4s3.6-1.2 5.2-3.4"
          fill="none"
          stroke="#FF8A4C"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function CalmMark({ title }: { title: string }) {
  return (
    <span className={`${TILE} bg-[#2180A8]`} data-vendor-mark="calm">
      <svg viewBox="0 0 56 56" className="h-12 w-12" role="img" aria-label={title}>
        <text
          x="28"
          y="32"
          textAnchor="middle"
          fill="#fff"
          fontSize="14"
          fontFamily="Instrument Sans, Inter, system-ui, sans-serif"
          fontWeight="700"
        >
          calm
        </text>
      </svg>
    </span>
  );
}

export interface PluginVendorMarkProps {
  slug: string;
  displayName: string;
}

export function PluginVendorMark({ slug, displayName }: PluginVendorMarkProps) {
  const title = `${displayName} mark`;
  if (slug === 'google_health') return <GoogleHealthMark title={title} />;
  if (slug === 'myfitnesspal') return <MyFitnessPalMark title={title} />;
  if (slug === 'cronometer') return <CronometerMark title={title} />;
  if (slug === 'strava') return <StravaMark title={title} />;
  if (slug === 'peloton') return <PelotonMark title={title} />;
  if (slug === 'headspace') return <HeadspaceMark title={title} />;
  if (slug === 'calm') return <CalmMark title={title} />;

  return (
    <span
      className={`${TILE} bg-white/[0.06]`}
      data-vendor-mark="fallback"
      data-testid={`plugin-vendor-mark-fallback-${slug}`}
    >
      <Plug className="h-6 w-6 text-white/70" strokeWidth={1.5} aria-hidden />
      <span className="sr-only">{title}</span>
    </span>
  );
}

export default PluginVendorMark;

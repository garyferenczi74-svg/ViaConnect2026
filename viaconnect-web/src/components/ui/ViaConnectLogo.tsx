'use client';

interface ViaConnectLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function DNAHelixIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Circle border — thick white */}
      <circle cx="16" cy="16" r="14.5" stroke="white" strokeWidth="2" fill="none" />

      {/* DNA Helix - left strand — orange */}
      <path
        d="M11 6 C11 6, 21 10, 21 16 C21 22, 11 26, 11 26"
        stroke="#B75E18"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* DNA Helix - right strand — orange */}
      <path
        d="M21 6 C21 6, 11 10, 11 16 C11 22, 21 26, 21 26"
        stroke="#B75E18"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Rungs — lighter orange */}
      <line x1="13" y1="9.5" x2="19" y2="9.5" stroke="rgba(183,94,24,0.5)" strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="13" x2="20" y2="13" stroke="rgba(183,94,24,0.5)" strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="16" x2="20" y2="16" stroke="rgba(183,94,24,0.6)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="19" x2="20" y2="19" stroke="rgba(183,94,24,0.5)" strokeWidth="1" strokeLinecap="round" />
      <line x1="13" y1="22.5" x2="19" y2="22.5" stroke="rgba(183,94,24,0.5)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

const SIZE_CONFIG = {
  sm: { icon: 18, text: 'text-sm', gap: 'gap-1' },
  md: { icon: 22, text: 'text-lg', gap: 'gap-1' },
  lg: { icon: 28, text: 'text-xl', gap: 'gap-1.5' },
};

export function ViaConnectLogo({ size = 'md', className = '' }: ViaConnectLogoProps) {
  const config = SIZE_CONFIG[size];

  return (
    <span className={`inline-flex items-center ${config.gap} ${className}`}>
      <DNAHelixIcon size={config.icon} />
      <span className={`${config.text} font-bold tracking-tight`}>
        <span className="text-[#B75E18]">Via</span>
        <span className="text-white">Connect</span>
      </span>
    </span>
  );
}

export { DNAHelixIcon };

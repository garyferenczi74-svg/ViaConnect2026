'use client';

interface HelixIconProps {
  size?: number;
  className?: string;
}

export function HelixIcon({ size = 20, className = '' }: HelixIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
    >
      {/* Left strand - orange */}
      <path
        d="M8 2C8 2 16 6 16 12C16 18 8 22 8 22"
        stroke="#B75E18"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right strand - teal */}
      <path
        d="M16 2C16 2 8 6 8 12C8 18 16 22 16 22"
        stroke="#2DA5A0"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Rungs */}
      <line x1="9.5" y1="6" x2="14.5" y2="6" stroke="rgba(183,94,24,0.5)" strokeWidth="1" strokeLinecap="round" />
      <line x1="8.5" y1="9" x2="15.5" y2="9" stroke="rgba(45,165,160,0.5)" strokeWidth="1" strokeLinecap="round" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" stroke="rgba(183,94,24,0.6)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8.5" y1="15" x2="15.5" y2="15" stroke="rgba(45,165,160,0.5)" strokeWidth="1" strokeLinecap="round" />
      <line x1="9.5" y1="18" x2="14.5" y2="18" stroke="rgba(183,94,24,0.5)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

"use client";

interface CalmingHelixBackgroundProps {
  phase: number;
  totalPhases: number;
}

export function CalmingHelixBackground({ phase, totalPhases }: CalmingHelixBackgroundProps) {
  const opacity = Math.max(0.01, 0.04 - (phase / totalPhases) * 0.03);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity }}
    >
      <svg
        className="absolute top-0 left-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <path
          d="M0,450 C240,350 480,550 720,450 C960,350 1200,550 1440,450"
          fill="none"
          stroke="#2DA5A0"
          strokeWidth="1.5"
        >
          <animate
            attributeName="d"
            values="M0,450 C240,350 480,550 720,450 C960,350 1200,550 1440,450;
                    M0,450 C240,550 480,350 720,450 C960,550 1200,350 1440,450;
                    M0,450 C240,350 480,550 720,450 C960,350 1200,550 1440,450"
            dur="25s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M0,450 C240,550 480,350 720,450 C960,550 1200,350 1440,450"
          fill="none"
          stroke="#B75E18"
          strokeWidth="1"
        >
          <animate
            attributeName="d"
            values="M0,450 C240,550 480,350 720,450 C960,550 1200,350 1440,450;
                    M0,450 C240,350 480,550 720,450 C960,350 1200,550 1440,450;
                    M0,450 C240,550 480,350 720,450 C960,550 1200,350 1440,450"
            dur="25s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
}

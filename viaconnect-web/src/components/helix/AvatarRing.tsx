'use client';

interface AvatarRingProps {
  initials: string;
  color: string;
  helix: number;
  maxHelix?: number;
  rank?: number;
  rankColor?: string;
  online?: boolean;
  size?: number;
}

const RANK_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #FFD700, #FFA500)',
  2: 'linear-gradient(135deg, #C0C0C0, #8A8A8A)',
  3: 'linear-gradient(135deg, #CD7F32, #A0522D)',
};

export function AvatarRing({
  initials,
  color,
  helix,
  maxHelix = 5000,
  rank,
  rankColor,
  online = true,
  size = 64,
}: AvatarRingProps) {
  const progress = Math.min(helix / maxHelix, 1);
  const circumference = 2 * Math.PI * (size / 2 - 3);
  const strokeDasharray = `${circumference * progress} ${circumference * (1 - progress)}`;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 3}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 3}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-1000"
        />
      </svg>

      {/* Inner circle with initials */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          top: 5,
          left: 5,
          width: size - 10,
          height: size - 10,
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
        }}
      >
        <span className="text-white font-bold" style={{ fontSize: size * 0.28 }}>
          {initials}
        </span>
      </div>

      {/* Online dot */}
      {online && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0d1520]"
        />
      )}

      {/* Rank badge */}
      {rank && rank <= 3 && (
        <div
          className="absolute -top-1 -right-1 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/20"
          style={{
            background: RANK_GRADIENTS[rank] || rankColor || color,
          }}
        >
          {rank}
        </div>
      )}
    </div>
  );
}

'use client';

interface ResearchToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

export function ResearchToggle({ label, description, enabled, onToggle }: ResearchToggleProps) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-4 cursor-pointer py-3 px-1 group"
    >
      {/* Toggle track */}
      <div
        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-300 ${
          enabled
            ? 'bg-gradient-to-r from-[#2DA5A0] to-[#35bdb7]'
            : 'bg-white/10'
        }`}
      >
        {/* Knob */}
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
            enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </div>

      {/* Labels */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-white group-hover:text-white/90 transition-colors">
          {label}
        </p>
        <p className="text-[12px] text-white/40 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import {
  Pill,
  Heart,
  Activity,
  FlaskConical,
  Brain,
  Moon,
  Dumbbell,
  Circle,
  Check,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  pill: Pill,
  heart: Heart,
  activity: Activity,
  flask: FlaskConical,
  brain: Brain,
  moon: Moon,
  dumbbell: Dumbbell,
};

interface ActionCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  time: string;
  status: 'pending' | 'completed' | 'missed' | 'upcoming';
  tokens: number;
  onComplete?: () => void;
}

const statusStyles = {
  pending: {
    iconContainer: 'bg-[#2DA5A0]/12',
    iconColor: 'text-[#2DA5A0]',
    tokenColor: 'text-[#2DA5A0]',
  },
  completed: {
    iconContainer: 'bg-green-500/12',
    iconColor: 'text-green-500',
    tokenColor: 'text-green-500',
  },
  missed: {
    iconContainer: 'bg-red-500/12',
    iconColor: 'text-red-500',
    tokenColor: 'text-[#2DA5A0]',
  },
  upcoming: {
    iconContainer: 'bg-slate-800',
    iconColor: 'text-slate-500',
    tokenColor: 'text-[#2DA5A0]',
  },
};

export function ActionCard({
  icon,
  title,
  subtitle,
  time,
  status,
  tokens,
  onComplete,
}: ActionCardProps) {
  const IconComponent = iconMap[icon] ?? Circle;
  const styles = statusStyles[status];

  const handleClick = () => {
    if (status === 'pending' && onComplete) {
      onComplete();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`glass-v2 flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
        status === 'missed' ? 'border-l-[3px] border-l-red-500' : ''
      } ${status === 'upcoming' ? 'opacity-70' : ''} ${
        status === 'pending' ? 'cursor-pointer hover:brightness-110' : ''
      }`}
    >
      {/* Left: Icon container */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${styles.iconContainer}`}
        >
          <IconComponent className={styles.iconColor} size={22} />
        </div>
        {status === 'completed' && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="text-white" size={12} />
          </div>
        )}
      </div>

      {/* Center: Title + Subtitle */}
      <div className="flex-1 min-w-0">
        <p className="text-body-md text-white font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-caption text-secondary truncate">{subtitle}</p>
        )}
      </div>

      {/* Right: Time + Tokens */}
      <div className="flex flex-col items-end flex-shrink-0 gap-1">
        <span className="text-caption text-tertiary">{time}</span>
        <span className={`text-caption font-medium ${styles.tokenColor}`}>
          +{tokens} VT
        </span>
      </div>
    </div>
  );
}

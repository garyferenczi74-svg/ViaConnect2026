'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function VitalityScoreGauge() {
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('bio_optimization_score, assessment_completed')
        .eq('id', user.id)
        .single();
      setScore(profile?.bio_optimization_score || 0);
      setCompleted(profile?.assessment_completed || false);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel('bio-optimization-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new.bio_optimization_score !== undefined) {
            setScore(payload.new.bio_optimization_score);
            setCompleted(payload.new.assessment_completed ?? false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (loading || score === 0) return;
    const duration = 1500;
    const start = Date.now();
    function animate() {
      const progress = Math.min((Date.now() - start) / duration, 1);
      setAnimatedScore(Math.round(score * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [score, loading]);

  const color =
    score >= 80 ? '#4ADE80' : score >= 60 ? '#22D3EE' : score >= 40 ? '#FBBF24' : '#F87171';
  const label =
    score >= 80
      ? 'Excellent'
      : score >= 60
        ? 'Good'
        : score >= 40
          ? 'Moderate'
          : score > 0
            ? 'Needs Attention'
            : 'Not Assessed';
  const r = 90;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animatedScore / 100) * circ;

  if (loading) {
    return (
      <div className="flex flex-col items-center p-4 sm:p-6">
        <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (score === 0 && !completed) {
    return (
      <div className="flex flex-col items-center p-4 sm:p-6">
        <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
          <svg viewBox="0 0 220 220" className="w-full h-full">
            <circle
              cx="110"
              cy="110"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
            />
            <text
              x="110"
              y="105"
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize="48"
              fontWeight="700"
            >
              0
            </text>
            <text
              x="110"
              y="130"
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="12"
            >
              Bio Optimization
            </text>
          </svg>
        </div>
        <p className="text-white/50 text-xs sm:text-sm mt-3 text-center">
          Complete your assessment to unlock your score
        </p>
        <a
          href="/profile/assessment"
          className="mt-3 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Take Assessment
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 sm:p-6">
      <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
        <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)',
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl sm:text-5xl font-bold" style={{ color }}>
            {animatedScore}
          </span>
          <span className="text-white/50 text-[10px] sm:text-xs mt-1">Bio Optimization</span>
        </div>
      </div>
      <span
        className="mt-3 text-xs sm:text-sm font-medium px-3 py-1 rounded-full"
        style={{ color, backgroundColor: `${color}15` }}
      >
        {label}
      </span>
    </div>
  );
}

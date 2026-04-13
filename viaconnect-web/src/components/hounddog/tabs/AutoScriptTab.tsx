'use client';

import React, { useState, useCallback } from 'react';
import { Zap, Edit3, ArrowRight, Loader } from 'lucide-react';
import { C } from '@/lib/hounddog/constants';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';
import PBar from '../shared/PBar';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AutoScript {
  title: string;
  hook: string;
  angle: string;
  score: number;
  duration: string;
}

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Reddit', 'All'] as const;
const COUNT_OPTIONS = [3, 5, 10, 15] as const;

const STAGES = [
  "Researching niche...",
  "Generating scripts...",
  "Scoring hooks...",
  "Finalizing...",
];

const MOCK_SCRIPTS: AutoScript[] = [
  { title: "Why Your Supplements Aren't Working", hook: "Your genetics determine...", angle: "Authority Gap", score: 94, duration: "45s" },
  { title: "The 3 Peptides That Changed My Biomarkers", hook: "After 90 days of tracking...", angle: "Proof/Results", score: 91, duration: "38s" },
  { title: "Stop Wasting Money on Generic Supplements", hook: "You're spending $200/month...", angle: "Loss Aversion", score: 88, duration: "52s" },
  { title: "What 10\u201327x Bioavailability Actually Means", hook: "Most supplements are destroyed...", angle: "Pattern Interrupt", score: 85, duration: "41s" },
  { title: "AI Built My Entire Supplement Stack From DNA", hook: "I uploaded my genetic data...", angle: "Transformation", score: 93, duration: "60s" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function scoreColor(s: number): string {
  if (s > 90) return C.green;
  if (s > 80) return C.teal;
  return C.orange;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.card2,
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  color: C.text,
  fontSize: 12,
  padding: '8px 10px',
  outline: 'none',
  fontFamily: 'inherit',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AutoScriptTab() {
  const [niche, setNiche] = useState('Precision Wellness / Peptides');
  const [platform, setPlatform] = useState('TikTok');
  const [count, setCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [scripts, setScripts] = useState<AutoScript[]>([]);

  const handleGenerate = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setScripts([]);
    setStage(STAGES[0]);

    const t1 = setTimeout(() => setStage(STAGES[1]), 550);
    const t2 = setTimeout(() => setStage(STAGES[2]), 1100);
    const t3 = setTimeout(() => setStage(STAGES[3]), 1650);
    const t4 = setTimeout(() => {
      setScripts(MOCK_SCRIPTS.slice(0, count));
      setLoading(false);
      setStage('');
    }, 2200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [loading, count]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ---- INPUT FORM ---- */}
      <div>
        {/* 3-col grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Niche"
            style={{ ...inputStyle, flex: 1 }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.teal; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border as string; }}
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            style={{ ...inputStyle, appearance: 'none' as const }}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p} style={{ background: C.card2 }}>{p}</option>
            ))}
          </select>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ ...inputStyle, appearance: 'none' as const }}
          >
            {COUNT_OPTIONS.map((c) => (
              <option key={c} value={c} style={{ background: C.card2 }}>{c}</option>
            ))}
          </select>
        </div>

        {/* Loading stage */}
        {loading && stage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Loader size={12} strokeWidth={1.5} color={C.orange} style={{ animation: 'hd-spin 1s linear infinite' }} />
            <span style={{ fontSize: 11, color: C.muted2 }}>{stage}</span>
          </div>
        )}

        <Btn variant="orange" onClick={handleGenerate} loading={loading} icon={Zap}>
          Generate Scripts
        </Btn>
      </div>

      {/* ---- RESULTS ---- */}
      {scripts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{scripts.length} Scripts Ready</span>
            <Btn variant="green" icon={ArrowRight}>Push All to Pipeline</Btn>
          </div>

          {/* Cards */}
          {scripts.map((s, i) => (
            <div
              key={i}
              style={{
                borderLeft: `3px solid ${C.teal}`,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderLeftColor: C.teal,
                borderLeftWidth: 3,
                borderRadius: 10,
                padding: 12,
                animation: 'hd-fade 0.4s ease',
                animationDelay: `${i * 80}ms`,
                animationFillMode: 'backwards',
              }}
            >
              {/* Title */}
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                #{i + 1} {'\u2014'} {s.title}
              </div>

              {/* Hook quote */}
              <div style={{ fontSize: 11, color: C.muted2, fontStyle: 'italic', marginBottom: 8 }}>
                &ldquo;{s.hook}&rdquo;
              </div>

              {/* Pills row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <Pill label={`${s.score}`} color={scoreColor(s.score)} />
                <Pill label={s.angle} color={C.teal} />
                <Pill label={s.duration} color={C.muted2} />
              </div>

              {/* PBar */}
              <div style={{ marginBottom: 10, maxWidth: 240 }}>
                <PBar value={s.score} color={scoreColor(s.score)} />
              </div>

              {/* Action btns */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" icon={Edit3}>Edit</Btn>
                <Btn variant="primary" icon={ArrowRight}>Pipeline</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

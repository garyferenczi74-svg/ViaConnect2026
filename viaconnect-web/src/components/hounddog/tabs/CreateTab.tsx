'use client';

import React, { useState, useCallback } from 'react';
import { Zap, CheckCircle, Edit3, Copy, ArrowRight, Loader } from 'lucide-react';
import { C } from '@/lib/hounddog/constants';
import SecHead from '../shared/SecHead';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface GeneratedResult {
  hook: string;
  body: string;
  cta: string;
  angle: string;
  hookScore: number;
  estimatedViews: string;
  bestTime: string;
  hashtags: string[];
}

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Reddit', 'All'] as const;

const MOCK_RESULT: GeneratedResult = {
  hook: "Your genetics determine which supplements actually work \u2014 most people are getting it completely wrong.",
  body: "[idea]\n\nGeneX360 data from 500 panels: your MTHFR variant alone can make standard B12 useless; or worse. We built ViaConnect because precision wellness shouldn't be guesswork.",
  cta: "Drop your supplement question below. Our AI looks at research; not marketing.",
  angle: "Authority Gap + Personalization",
  hookScore: 91,
  estimatedViews: "800K\u20132.1M",
  bestTime: "6:30 PM weekdays",
  hashtags: ["#precisionwellness", "#peptides", "#GeneX360", "#biohacking"],
};

const STAGES = [
  "Analyzing idea...",
  "Researching hooks...",
  "Crafting script...",
  "Scoring...",
];

/* ------------------------------------------------------------------ */
/*  Shared inline styles                                               */
/* ------------------------------------------------------------------ */
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
export default function CreateTab() {
  const [niche, setNiche] = useState('Precision Wellness / Peptides');
  const [platform, setPlatform] = useState('TikTok');
  const [rawIdea, setRawIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<GeneratedResult | null>(null);

  const handleGenerate = useCallback(() => {
    if (!rawIdea.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setStage(STAGES[0]);

    const t1 = setTimeout(() => setStage(STAGES[1]), 550);
    const t2 = setTimeout(() => setStage(STAGES[2]), 1100);
    const t3 = setTimeout(() => setStage(STAGES[3]), 1650);
    const t4 = setTimeout(() => {
      setResult(MOCK_RESULT);
      setLoading(false);
      setStage('');
    }, 2200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [rawIdea, loading]);

  const scoreColor = (result?.hookScore ?? 0) > 90 ? C.green : C.teal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ---- INPUT FORM ---- */}
      <div>
        <SecHead label="">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={13} strokeWidth={1.5} color={C.orange} />
            <span style={{ fontSize: 9, fontWeight: 700, color: C.orange, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              IDEA TO PIPELINE
            </span>
          </div>
        </SecHead>

        {/* 2-col grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 10 }}
        >
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Niche"
            style={inputStyle}
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
        </div>

        {/* Raw Idea */}
        <textarea
          rows={4}
          value={rawIdea}
          onChange={(e) => setRawIdea(e.target.value)}
          placeholder="Drop your idea here; rough notes, a concept, anything. Hounddog handles the rest."
          style={{ ...inputStyle, borderRadius: 8, resize: 'vertical', marginBottom: 10 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.teal; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.border as string; }}
        />

        {/* Loading stage */}
        {loading && stage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Loader size={12} strokeWidth={1.5} color={C.orange} style={{ animation: 'hd-spin 1s linear infinite' }} />
            <span style={{ fontSize: 11, color: C.muted2 }}>{stage}</span>
          </div>
        )}

        <Btn variant="orange" onClick={handleGenerate} loading={loading} icon={Zap}>
          Generate &amp; Push to Pipeline
        </Btn>
      </div>

      {/* ---- RESULT ---- */}
      {result && (
        <div style={{ animation: 'hd-fade 0.4s ease', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Success row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} strokeWidth={1.5} color={C.green} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Script Generated</span>
            <Pill label={`${result.hookScore}`} color={scoreColor} />
          </div>

          {/* Hook block */}
          <div style={{ borderLeft: `3px solid ${C.orange}`, background: C.card, border: `1px solid ${C.border}`, borderLeftColor: C.orange, borderLeftWidth: 3, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>HOOK</div>
            <div style={{ fontSize: 12, color: C.text, whiteSpace: 'pre-wrap' }}>{result.hook}</div>
          </div>

          {/* Body block */}
          <div style={{ borderLeft: `3px solid ${C.teal}`, background: C.card, border: `1px solid ${C.border}`, borderLeftColor: C.teal, borderLeftWidth: 3, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>BODY</div>
            <div style={{ fontSize: 12, color: C.text, whiteSpace: 'pre-wrap' }}>{result.body}</div>
          </div>

          {/* CTA block */}
          <div style={{ borderLeft: `3px solid ${C.purple}`, background: C.card, border: `1px solid ${C.border}`, borderLeftColor: C.purple, borderLeftWidth: 3, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>CTA</div>
            <div style={{ fontSize: 12, color: C.text, whiteSpace: 'pre-wrap' }}>{result.cta}</div>
          </div>

          {/* Stats 3-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Angle</div>
              <div style={{ fontSize: 12, color: C.text }}>{result.angle}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Est. Views</div>
              <div style={{ fontSize: 12, color: C.green }}>{result.estimatedViews}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Best Time</div>
              <div style={{ fontSize: 12, color: C.text }}>{result.bestTime}</div>
            </div>
          </div>

          {/* Hashtag pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.hashtags.map((tag) => (
              <Pill key={tag} label={tag} color={C.teal} />
            ))}
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Btn variant="green" icon={ArrowRight}>Add to Pipeline</Btn>
            <Btn variant="ghost" icon={Edit3}>Edit in Editor</Btn>
            <Btn variant="ghost" icon={Copy}>Clone for Others</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

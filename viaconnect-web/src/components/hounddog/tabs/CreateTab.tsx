'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { C } from '@/lib/hounddog/constants';
import SecHead from '../shared/SecHead';
import Btn from '../shared/Btn';

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Reddit', 'All'] as const;

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.card2,
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  color: C.text,
  fontSize: 16,
  padding: '10px 12px',
  minHeight: 44,
  outline: 'none',
  fontFamily: 'inherit',
};

export default function CreateTab() {
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [rawIdea, setRawIdea] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SecHead label="">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={13} strokeWidth={1.5} color={C.orange} />
            <span style={{ fontSize: 9, fontWeight: 700, color: C.orange, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              IDEA TO PIPELINE
            </span>
          </div>
        </SecHead>

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

        <textarea
          rows={4}
          value={rawIdea}
          onChange={(e) => setRawIdea(e.target.value)}
          placeholder="Drop your idea here; rough notes, a concept, anything. Hounddog handles the rest."
          style={{ ...inputStyle, borderRadius: 8, resize: 'vertical', marginBottom: 10 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.teal; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.border as string; }}
        />

        <Btn variant="orange" onClick={() => {}} icon={Zap} className="min-h-[44px]">
          Generate &amp; Push to Pipeline
        </Btn>
      </div>
    </div>
  );
}

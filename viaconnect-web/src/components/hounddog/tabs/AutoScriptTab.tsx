'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { C } from '@/lib/hounddog/constants';
import Btn from '../shared/Btn';
import EmptyState from '../shared/EmptyState';

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Reddit', 'All'] as const;
const COUNT_OPTIONS = [3, 5, 10, 15] as const;

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

export default function AutoScriptTab() {
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [count, setCount] = useState<number>(5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EmptyState />

      <div>
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

        <Btn variant="orange" onClick={() => {}} icon={Zap}>
          Generate Scripts
        </Btn>
      </div>
    </div>
  );
}

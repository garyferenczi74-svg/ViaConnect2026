'use client';

import React, { useState } from 'react';
import { Crosshair, Search } from 'lucide-react';
import { C, COMPETITORS, TOP_HOOKS } from '@/lib/hounddog/constants';
import { hasLiveSocialLastSync, loadHounddogLiveAccounts } from '@/lib/hounddog/honesty';
import {
  loadHounddogResearchFindings,
  type HounddogResearchFinding,
} from '@/lib/hounddog/researchFindings';
import SecHead from '../shared/SecHead';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';

export default function ResearchTab({
  findings,
}: {
  findings?: readonly HounddogResearchFinding[];
} = {}) {
  const [query, setQuery] = useState('');
  const showLive = hasLiveSocialLastSync(loadHounddogLiveAccounts());
  const researchFindings = findings ?? loadHounddogResearchFindings();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <SecHead label="">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Crosshair size={13} strokeWidth={1.5} color={C.muted} />
            <span style={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
              Competitor Analyzer
            </span>
          </div>
        </SecHead>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter competitor handle or URL..."
            style={{
              flex: 1,
              minWidth: 200,
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
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.teal; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border as string; }}
          />
          <Btn variant="primary" onClick={() => {}} icon={Search} className="min-h-[44px]">
            Analyze
          </Btn>
        </div>
      </div>

      {researchFindings.length > 0 && (
        <div>
          <SecHead label="Research findings" />
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {researchFindings.map((finding, index) => (
              <div
                key={`${finding.url ?? finding.title}-${index}`}
                style={{
                  padding: 12,
                  borderBottom:
                    index < researchFindings.length - 1 ? `1px solid ${C.border}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {finding.title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    fontSize: 11,
                    color: C.muted2,
                  }}
                >
                  {finding.platform && <span>{finding.platform}</span>}
                  {finding.score != null && <span>{finding.score}</span>}
                  {finding.fetchedAt && <span>{finding.fetchedAt}</span>}
                </div>
                {finding.url && (
                  <a
                    href={finding.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: C.teal,
                      wordBreak: 'break-all',
                      minHeight: 44,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {finding.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showLive && COMPETITORS.length > 0 && (
        <div>
          <SecHead label="Tracked Competitors" />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Competitor', 'Platform', 'Top Hook', 'Views', 'Eng%'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: 8,
                          fontWeight: 600,
                          color: C.muted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '10px 12px',
                          textAlign: h === 'Views' || h === 'Eng%' ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPETITORS.map((comp) => (
                    <tr key={comp.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{comp.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: C.muted2 }}>{comp.platform}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: C.muted2, fontStyle: 'italic' }}>
                        &ldquo;{comp.hook}&rdquo;
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: C.text, textAlign: 'right' }}>{comp.views}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <Pill label={comp.eng} color={C.teal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showLive && TOP_HOOKS.length > 0 && (
        <div>
          <SecHead label="Top Hooks in Niche" />
        </div>
      )}
    </div>
  );
}

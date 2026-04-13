'use client';

import React, { useState, useCallback } from 'react';
import { Crosshair, Search, Loader, Copy, Zap } from 'lucide-react';
import { C, COMPETITORS, TOP_HOOKS } from '@/lib/hounddog/constants';
import SecHead from '../shared/SecHead';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';
import PBar from '../shared/PBar';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface HookInsight {
  hook: string;
  angle: string;
  score: number;
}

interface RecommendedAngle {
  angle: string;
  rationale: string;
}

interface CompetitorInsights {
  topHooks: HookInsight[];
  contentGaps: string[];
  recommendedAngles: RecommendedAngle[];
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const MOCK_INSIGHTS: CompetitorInsights = {
  topHooks: [
    { hook: "I tested this for 30 days", angle: "Proof", score: 94 },
    { hook: "Doctors won't tell you this", angle: "Authority", score: 91 },
    { hook: "The supplement industry is lying", angle: "Pattern Interrupt", score: 88 },
  ],
  contentGaps: [
    "DNA-based supplement personalization",
    "Peptide bioavailability science",
    "GeneX360 clinical results",
  ],
  recommendedAngles: [
    { angle: "Authority + Proof", rationale: "Combine clinical data with personal results for maximum credibility" },
    { angle: "Personalization", rationale: "DNA/genetics angle is underserved in this niche" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function scoreColor(s: number): string {
  if (s > 90) return C.green;
  if (s > 80) return C.teal;
  return C.orange;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ResearchTab() {
  const [query, setQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<CompetitorInsights | null>(null);

  const handleAnalyze = useCallback(() => {
    if (!query.trim() || analyzing) return;
    setAnalyzing(true);
    setInsights(null);
    setTimeout(() => {
      setInsights(MOCK_INSIGHTS);
      setAnalyzing(false);
    }, 1500);
  }, [query, analyzing]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ============================================================ */}
      {/*  COMPETITOR ANALYZER                                          */}
      {/* ============================================================ */}
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
              background: C.card2,
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              color: C.text,
              fontSize: 12,
              padding: '8px 10px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.teal; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border as string; }}
          />
          <Btn variant="primary" onClick={handleAnalyze} loading={analyzing} icon={Search}>
            Analyze
          </Btn>
        </div>

        {/* AI Intelligence Report */}
        {insights && (
          <div
            style={{
              marginTop: 14,
              background: C.teal + '08',
              border: `1px solid ${C.teal}25`,
              borderRadius: 12,
              padding: 16,
              animation: 'hd-fade 0.4s ease',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              AI Intelligence Report
            </div>

            {/* Top Hooks */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Top Hooks</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {insights.topHooks.map((h, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>&ldquo;{h.hook}&rdquo;</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Pill label={`${h.score}`} color={scoreColor(h.score)} />
                      <Pill label={h.angle} color={C.teal} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Gaps */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Content Gaps</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {insights.contentGaps.map((gap, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>{gap}</li>
                ))}
              </ul>
            </div>

            {/* Recommended Angles */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Recommended Angles</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {insights.recommendedAngles.map((ra, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{ra.angle}</div>
                    <div style={{ fontSize: 11, color: C.muted2 }}>{ra.rationale}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  TRACKED COMPETITORS TABLE                                    */}
      {/* ============================================================ */}
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
                  <tr
                    key={comp.name}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{comp.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: C.muted2 }}>{comp.platform}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: C.muted2, fontStyle: 'italic', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* ============================================================ */}
      {/*  TOP HOOKS IN NICHE                                           */}
      {/* ============================================================ */}
      <div>
        <SecHead label="Top Hooks in Niche" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TOP_HOOKS.slice(0, 5).map((th, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              {/* Hook text */}
              <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>{th.hook}</div>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <Pill label={`${th.score}`} color={scoreColor(th.score)} />
                <Pill label={th.angle} color={C.teal} />
                <Pill label={`${th.uses} uses`} color={C.muted2} />
              </div>

              {/* PBar */}
              <div style={{ marginBottom: 10, maxWidth: 240 }}>
                <PBar value={th.score} color={scoreColor(th.score)} />
              </div>

              {/* Action btns */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" icon={Copy}>Use Hook</Btn>
                <Btn variant="ghost" icon={Zap}>Generate Script</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

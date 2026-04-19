'use client';

// Prompt #96 Phase 3: SVG label preview.
//
// Renders an approximate visual of the printed label using the chosen
// layout template + brand palette + supplement facts JSON. Two panels:
// front (statement of identity, tagline, brand) and back (supplement
// facts, directions, manufacturer line, FDA disclaimer when claims
// present).
//
// This is a faithful mockup, not a print-ready PDF. PDF proof generation
// uses the browser's native print-to-PDF (board-pack pattern) so we do
// not pull in a PDF library.

import type { SupplementFactsPanel, SupplementFactsIngredient } from '@/lib/white-label/supplement-facts';

export interface LabelPreviewBrand {
  brand_name: string;
  primary_color_hex: string | null;
  secondary_color_hex: string | null;
  background_color_hex: string | null;
  text_color_hex: string | null;
  brand_font_primary: string | null;
  practice_legal_name: string;
  practice_city: string;
  practice_state: string;
}

export interface LabelPreviewDesign {
  display_product_name: string;
  short_description: string | null;
  long_description: string | null;
  tagline: string | null;
  layout_template: 'classic_vertical' | 'modern_horizontal' | 'premium_wrap' | 'clinical_minimal';
  structure_function_claims: string[];
  usage_directions: string | null;
  warning_text: string | null;
  manufacturer_line: string;
  supplement_facts_panel_data: SupplementFactsPanel;
  allergen_statement: string | null;
  other_ingredients: string | null;
}

const FDA_DISCLAIMER =
  'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.';

const W = 280; // virtual units; the SVG scales
const H = 440;

export function LabelPreview({ brand, design }: { brand: LabelPreviewBrand; design: LabelPreviewDesign }) {
  const bg = brand.background_color_hex ?? '#FFFFFF';
  const fg = brand.text_color_hex ?? '#000000';
  const primary = brand.primary_color_hex ?? '#1a3b6e';
  const secondary = brand.secondary_color_hex ?? '#c69447';
  const font = brand.brand_font_primary ?? 'Instrument Sans';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Panel title="Front">
        <FrontPanel
          brand={brand}
          design={design}
          bg={bg}
          fg={fg}
          primary={primary}
          secondary={secondary}
          font={font}
        />
      </Panel>
      <Panel title="Back">
        <BackPanel
          brand={brand}
          design={design}
          bg={bg}
          fg={fg}
          primary={primary}
          secondary={secondary}
          font={font}
        />
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">{title}</p>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="aspect-[280/440] w-full bg-white/5 rounded">
          {children}
        </div>
      </div>
    </div>
  );
}

interface SubProps {
  brand: LabelPreviewBrand;
  design: LabelPreviewDesign;
  bg: string;
  fg: string;
  primary: string;
  secondary: string;
  font: string;
}

function FrontPanel({ brand, design, bg, fg, primary, secondary, font }: SubProps) {
  const { layout_template } = design;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width={W} height={H} fill={bg} />

      {layout_template === 'premium_wrap' && (
        <rect x="0" y="0" width={W} height="80" fill={primary} />
      )}
      {layout_template === 'modern_horizontal' && (
        <rect x="0" y={H - 80} width={W} height="80" fill={primary} opacity="0.1" />
      )}

      {/* Brand strip */}
      <text
        x={W / 2}
        y={layout_template === 'premium_wrap' ? 40 : layout_template === 'classic_vertical' ? 36 : 60}
        textAnchor="middle"
        fontFamily={font}
        fontSize="14"
        fontWeight="600"
        fill={layout_template === 'premium_wrap' ? bg : primary}
      >
        {brand.brand_name || 'YOUR BRAND'}
      </text>

      {/* Statement of identity */}
      <text
        x={W / 2}
        y={layout_template === 'premium_wrap' ? 130 : layout_template === 'classic_vertical' ? 110 : 150}
        textAnchor="middle"
        fontFamily={font}
        fontSize={layout_template === 'clinical_minimal' ? '24' : '28'}
        fontWeight="700"
        fill={fg}
      >
        {design.display_product_name}
      </text>

      {design.tagline && (
        <text
          x={W / 2}
          y={layout_template === 'premium_wrap' ? 162 : layout_template === 'classic_vertical' ? 140 : 180}
          textAnchor="middle"
          fontFamily={font}
          fontSize="12"
          fill={secondary}
        >
          {truncate(design.tagline, 40)}
        </text>
      )}

      {design.short_description && (
        <foreignObject x="20" y="200" width={W - 40} height="120">
          <div
            style={{
              fontFamily: font,
              fontSize: '11px',
              color: fg,
              lineHeight: '1.4',
              textAlign: 'center',
            }}
          >
            {design.short_description}
          </div>
        </foreignObject>
      )}

      {/* Net quantity */}
      <text
        x={W / 2}
        y={H - 30}
        textAnchor="middle"
        fontFamily={font}
        fontSize="11"
        fontWeight="600"
        fill={fg}
      >
        {design.supplement_facts_panel_data?.net_quantity ?? 'net quantity'}
      </text>
    </svg>
  );
}

function BackPanel({ brand, design, bg, fg, primary, font }: SubProps) {
  const facts = design.supplement_facts_panel_data;
  const ingredients: SupplementFactsIngredient[] = facts?.ingredients ?? [];
  const hasClaims = (design.structure_function_claims ?? []).length > 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width={W} height={H} fill={bg} />

      <foreignObject x="14" y="14" width={W - 28} height={H - 28}>
        <div
          style={{
            fontFamily: font,
            color: fg,
            fontSize: '8px',
            lineHeight: '1.35',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            height: '100%',
          }}
        >
          {/* Supplement facts panel */}
          <div style={{ border: `2px solid ${fg}`, padding: '6px' }}>
            <div style={{ fontWeight: 700, fontSize: '11px', borderBottom: `1px solid ${fg}`, paddingBottom: '2px' }}>
              Supplement Facts
            </div>
            <div style={{ fontSize: '8px', borderBottom: `1px solid ${fg}`, paddingBottom: '2px' }}>
              Serving size: {facts?.serving_size ?? 'unknown'}
              <br />
              Servings per container: {facts?.servings_per_container ?? 0}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: `1px solid ${fg}` }}>Ingredient</th>
                  <th style={{ textAlign: 'right', borderBottom: `1px solid ${fg}` }}>Amount</th>
                  <th style={{ textAlign: 'right', borderBottom: `1px solid ${fg}` }}>%DV</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.length === 0 && (
                  <tr><td colSpan={3} style={{ fontStyle: 'italic' }}>(facts not yet populated)</td></tr>
                )}
                {ingredients.slice(0, 8).map((ing, i) => (
                  <tr key={i}>
                    <td style={{ paddingTop: '1px' }}>{ing.name}</td>
                    <td style={{ paddingTop: '1px', textAlign: 'right' }}>{ing.amount}</td>
                    <td style={{ paddingTop: '1px', textAlign: 'right' }}>
                      {ing.daily_value_percent != null ? `${ing.daily_value_percent}%` : '*'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: '7px', marginTop: '2px' }}>* Daily Value not established.</div>
          </div>

          {design.other_ingredients && (
            <div style={{ fontSize: '7px' }}>
              <span style={{ fontWeight: 600 }}>Other ingredients: </span>
              {design.other_ingredients}
            </div>
          )}

          {design.allergen_statement && (
            <div style={{ fontSize: '7px', fontWeight: 600 }}>
              {design.allergen_statement}
            </div>
          )}

          {design.usage_directions && (
            <div style={{ fontSize: '8px' }}>
              <span style={{ fontWeight: 600 }}>Directions: </span>
              {design.usage_directions}
            </div>
          )}

          {design.warning_text && (
            <div style={{ fontSize: '7px' }}>
              <span style={{ fontWeight: 600 }}>Warning: </span>
              {design.warning_text}
            </div>
          )}

          {hasClaims && (
            <div style={{ fontSize: '7px', fontStyle: 'italic' }}>
              {FDA_DISCLAIMER}
            </div>
          )}

          <div style={{ marginTop: 'auto', fontSize: '7px', borderTop: `1px solid ${primary}`, paddingTop: '4px' }}>
            <div style={{ fontWeight: 600 }}>{design.manufacturer_line}</div>
            <div>
              Distributed by {brand.practice_legal_name}, {brand.practice_city}, {brand.practice_state}
            </div>
          </div>
        </div>
      </foreignObject>
    </svg>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}.` : s;
}

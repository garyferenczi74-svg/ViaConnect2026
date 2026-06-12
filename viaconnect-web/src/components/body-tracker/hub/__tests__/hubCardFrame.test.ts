// Prompt 183f (2026-06-11): source as text contract tests for the shared
// hub-card-frame css, the tapered luminous edge frame that REPLACED the SVG
// AccentLine on every bento card of both hubs. Same convention as the other
// hub tests (readFileSync + assert on the source). These lock the masked
// gradient ring technique: both mask-composite forms (Chrome/Edge + Safari),
// the ring paddings, the blur on the glow layer only, the FIXED PIXEL taper
// stops, border-radius inherit, the teal family triplets, the orange variant,
// the decorative posture, and the no dash rule. A consumers block locks the
// body-tracker hub call sites (the nutrition call sites are locked in their
// own test files) and that AccentLine is gone from every consumer.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CSS = path.resolve(__dirname, '..', 'hub-card-frame.css');
const BENTO = path.resolve(__dirname, '..', 'BentoCard.tsx');
const GUIDANCE = path.resolve(__dirname, '..', 'GuidanceStrip.tsx');
const CONNECTIONS = path.resolve(__dirname, '..', 'ConnectionsStrip.tsx');
const RETAKE = path.resolve(__dirname, '..', 'AssessmentRetakeCard.tsx');

describe('hub-card-frame.css', () => {
  const css = readFileSync(CSS, 'utf-8');

  it('carries BOTH mask-composite forms on both layers (Chrome/Edge xor + standard exclude)', () => {
    const webkit = css.match(/-webkit-mask-composite: xor;/g) ?? [];
    const standard = css.match(/mask-composite: exclude;/g) ?? [];
    expect(webkit.length).toBe(2);
    expect(standard.length).toBe(2);
  });

  it('is decorative only: pointer-events none on both layers', () => {
    const none = css.match(/pointer-events: none;/g) ?? [];
    expect(none.length).toBe(2);
  });

  it('cuts the ring from the card rectangle via the padding thicknesses (1.5px crisp, 2px glow)', () => {
    expect(css).toContain('padding: 1.5px;');
    expect(css).toContain('padding: 2px;');
  });

  it('blurs the glow layer only: filter blur(5px) on ::after, never on ::before', () => {
    const beforeStart = css.indexOf('.hub-card-frame::before');
    const afterStart = css.indexOf('.hub-card-frame::after');
    expect(beforeStart).toBeGreaterThan(-1);
    expect(afterStart).toBeGreaterThan(beforeStart);
    const beforeBlock = css.slice(beforeStart, afterStart);
    const afterBlock = css.slice(afterStart);
    expect(beforeBlock).not.toContain('filter: blur');
    expect(afterBlock).toContain('filter: blur(5px);');
    const blurs = css.match(/filter: blur\(5px\);/g) ?? [];
    expect(blurs.length).toBe(1);
  });

  it('tapers on FIXED PIXEL stops, not percents: 0px/16px/34px/60px crisp and 0px/28px/56px glow', () => {
    // Crisp ring (::before).
    expect(css).toContain('0.95) 0px');
    expect(css).toContain('0.7) 16px');
    expect(css).toContain('0.35) 34px');
    expect(css).toContain('0) 60px');
    // Blurred glow (::after).
    expect(css).toContain('0.55) 0px');
    expect(css).toContain('0.18) 28px');
    expect(css).toContain('0) 56px');
    // No percent stops anywhere in the gradients.
    expect(css).not.toMatch(/\d%\s*[,)]/);
  });

  it('follows the host corner radius natively via border-radius inherit on both layers', () => {
    const inherits = css.match(/border-radius: inherit;/g) ?? [];
    expect(inherits.length).toBe(2);
  });

  it('uses the teal family triplets exactly as the variable defaults', () => {
    expect(css).toContain('--frame-hi, 159, 240, 236');
    expect(css).toContain('--frame-mid, 127, 214, 210');
    expect(css).toContain('--frame-base, 45, 165, 160');
  });

  it('defines the orange variant variables (Plasma energy family) for the Update Your Assessment card', () => {
    expect(css).toContain('.hub-card-frame--orange');
    expect(css).toContain('--frame-hi: 240, 162, 78;');
    expect(css).toContain('--frame-mid: 212, 130, 59;');
    expect(css).toContain('--frame-base: 183, 94, 24;');
  });

  it('contains no em or en dashes', () => {
    expect(css.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(css.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('hub-card-frame body-tracker consumers', () => {
  const consumers = [
    { name: 'BentoCard', file: BENTO },
    { name: 'GuidanceStrip', file: GUIDANCE },
    { name: 'ConnectionsStrip', file: CONNECTIONS },
    { name: 'AssessmentRetakeCard', file: RETAKE },
  ];

  it.each(consumers)('$name carries hub-card-frame on its root, imports the css, and no longer references AccentLine', ({ file }) => {
    const src = readFileSync(file, 'utf-8');
    expect(src).toContain('hub-card-frame ');
    expect(src).toContain("import './hub-card-frame.css';");
    expect(src).not.toContain('AccentLine');
  });

  it('AssessmentRetakeCard keeps its ORANGE accent via BOTH classes on the relative rounded root (read only lock)', () => {
    const src = readFileSync(RETAKE, 'utf-8');
    expect(src).toContain('hub-card-frame hub-card-frame--orange relative rounded-xl');
  });
});

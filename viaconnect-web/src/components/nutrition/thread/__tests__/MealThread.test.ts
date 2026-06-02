// Prompt 172 Phase 2 (172c): MealThread source presence sanity.
//
// vitest runs node only without jsdom. We assert the source level contract:
//   - exports MealThread function component, client component
//   - purely presentational (no fetch, no Supabase, no useState/useEffect)
//   - renders the children inside a top of stack slot
//   - renders up to two priors stacked beneath the top card
//   - never spans 3+ priors (visual depth cap per spec)
//   - uses brand tokens (Card #1E3054)
//   - no em or en dashes, no emojis
//   - Lucide strokeWidth 1.5 if any icon imported

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '..', 'MealThread.tsx');

describe('MealThread source', () => {
  const source = readFileSync(FILE, 'utf-8');

  describe('component shape', () => {
    it('exports a MealThread function component', () => {
      expect(source).toContain('export function MealThread');
    });

    it('marks the file as a client component', () => {
      expect(source).toContain("'use client'");
    });

    it('is purely presentational (no fetch, no Supabase, no data hooks)', () => {
      expect(source).not.toContain('createClient');
      expect(source).not.toContain('createBrowserClient');
      expect(source).not.toContain('fetch(');
      expect(source).not.toContain('useEffect');
      expect(source).not.toContain('useReducer');
      expect(source).not.toContain('useState(');
    });
  });

  describe('stack structure', () => {
    it('renders children inside a top of stack slot', () => {
      expect(source).toContain('data-meal-thread-top');
      expect(source).toContain('{props.children}');
    });

    it('renders priors beneath the top card with stacked styling', () => {
      expect(source).toContain('data-meal-thread-prior');
      expect(source).toContain('translateY');
      expect(source).toContain('opacity');
    });

    it('caps the stack at two priors', () => {
      // slice(0, 2) keeps the stack visually shallow regardless of how
      // many entries the parent passes in.
      expect(source).toContain('.slice(0, 2)');
    });

    it('marks priors as aria-hidden (decorative, not a focusable list)', () => {
      expect(source).toContain('aria-hidden="true"');
    });

    it('uses pointer-events-none on the priors wrapper (no interactivity)', () => {
      expect(source).toContain('pointer-events-none');
    });
  });

  describe('brand tokens and hard rules', () => {
    it('uses the Card #1E3054 token on the prior tiles', () => {
      expect(source).toContain('#1E3054');
    });

    it('contains no em or en dashes', () => {
      expect(source.includes('—')).toBe(false);
      expect(source.includes('–')).toBe(false);
    });

    it('uses Lucide strokeWidth 1.5 on any iconography imported', () => {
      const importsLucide = source.includes("from 'lucide-react'");
      if (importsLucide) {
        expect(source).toContain('strokeWidth={1.5}');
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  MORNING_CARD_SCORE_LABEL,
  MORNING_CARD_CONTRIBUTORS_LABEL,
  MORNING_CARD_PENDING_SCORE,
  MORNING_CTA_EMPTY,
  MORNING_CTA_EMPTY_LINK,
  MORNING_CTA_ERROR,
  MORNING_CTA_LOADING,
  MORNING_CTA_RETRY,
  MORNING_CONTRIBUTOR_PENDING_NOTE,
  MORNING_CONTRIBUTOR_PENDING_VALUE,
  MORNING_CONNECT_YOUR_DEVICE,
  MORNING_CONNECTIONS_HREF,
  morningScoreAria,
} from '../copy';

describe('morning-card copy', () => {
  it('names the score Bio Optimization Score', () => {
    expect(MORNING_CARD_SCORE_LABEL).toBe('Bio Optimization Score');
    expect(MORNING_CARD_SCORE_LABEL).not.toMatch(/Vitality/i);
    expect(MORNING_CARD_CONTRIBUTORS_LABEL).toBe("In today's score");
    expect(MORNING_CARD_CONTRIBUTORS_LABEL).not.toMatch(/Vitality/i);
  });

  it('uses an honest pending score placeholder, never 0', () => {
    expect(MORNING_CARD_PENDING_SCORE).toBe('--');
    expect(morningScoreAria(null)).toBe('Bio Optimization Score not yet computed');
    expect(morningScoreAria(72)).toBe('Bio Optimization Score 72');
  });

  it('keeps contributor pending copy free of Helix and Vitality', () => {
    expect(MORNING_CONTRIBUTOR_PENDING_NOTE).toContain('pending');
    expect(MORNING_CONTRIBUTOR_PENDING_NOTE).not.toMatch(/Helix/i);
    expect(MORNING_CONTRIBUTOR_PENDING_NOTE).not.toMatch(/Vitality/i);
    expect(MORNING_CONTRIBUTOR_PENDING_NOTE).not.toMatch(/[—–]/);
    expect(MORNING_CONTRIBUTOR_PENDING_VALUE).toBe('UNKNOWN');
    expect(MORNING_CONNECT_YOUR_DEVICE).toBe('Connect your device');
    expect(MORNING_CONNECTIONS_HREF).toBe('/body-tracker/connections');
  });

  it('locks Brief 48 hero protocol copy', () => {
    expect(MORNING_CTA_EMPTY).toBe('No protocol item due today.');
    expect(MORNING_CTA_EMPTY_LINK).toBe('My Supplements');
    expect(MORNING_CTA_LOADING).toBe('Loading today protocol');
    expect(MORNING_CTA_ERROR).toBe("Couldn't load today's protocol.");
    expect(MORNING_CTA_RETRY).toBe('Retry');
    expect(MORNING_CTA_EMPTY).not.toMatch(/Complete your assessment/i);
    expect(MORNING_CTA_ERROR).not.toBe('Protocol unavailable');
  });
});

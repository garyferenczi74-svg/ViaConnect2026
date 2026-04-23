import { describe, it, expect } from 'vitest';
import {
  detentionCountdownState,
  recordationRenewalCountdownState,
  RECORDATION_GRACE_DAYS,
  DETENTION_RESPONSE_BD,
  SEIZURE_DISCLOSURE_BD,
} from '@/lib/customs/types';

describe('detentionCountdownState — 7 BD response window under § 133.21(b)(2)(i)', () => {
  it('healthy at 7 business days remaining', () => {
    expect(detentionCountdownState(7)).toBe('healthy');
  });

  it('caution at 6 business days', () => {
    expect(detentionCountdownState(6)).toBe('caution');
  });

  it('caution at 3 business days', () => {
    expect(detentionCountdownState(3)).toBe('caution');
  });

  it('critical at 2 business days', () => {
    expect(detentionCountdownState(2)).toBe('critical');
  });

  it('critical at 1 business day', () => {
    expect(detentionCountdownState(1)).toBe('critical');
  });

  it('critical at 0 business days (deadline today)', () => {
    expect(detentionCountdownState(0)).toBe('critical');
  });

  it('missed at -1 business days (past deadline)', () => {
    expect(detentionCountdownState(-1)).toBe('missed');
  });

  it('missed at -30 business days', () => {
    expect(detentionCountdownState(-30)).toBe('missed');
  });

  it('healthy at the full 7-BD statutory window', () => {
    expect(detentionCountdownState(DETENTION_RESPONSE_BD)).toBe('healthy');
  });

  it('healthy for the 30-BD disclosure clock range', () => {
    expect(detentionCountdownState(SEIZURE_DISCLOSURE_BD)).toBe('healthy');
    expect(detentionCountdownState(15)).toBe('healthy');
  });
});

describe('recordationRenewalCountdownState — renewal alert thresholds', () => {
  it('healthy at 180 days before expiration', () => {
    expect(recordationRenewalCountdownState(180)).toBe('healthy');
  });

  it('healthy at 120 days (T-120 alert sends but status remains healthy window)', () => {
    expect(recordationRenewalCountdownState(120)).toBe('healthy');
  });

  it('caution at 60 days', () => {
    expect(recordationRenewalCountdownState(60)).toBe('caution');
  });

  it('caution at 45 days', () => {
    expect(recordationRenewalCountdownState(45)).toBe('caution');
  });

  it('caution at 31 days (just above the critical boundary)', () => {
    expect(recordationRenewalCountdownState(31)).toBe('caution');
  });

  it('critical at 30 days', () => {
    expect(recordationRenewalCountdownState(30)).toBe('critical');
  });

  it('critical at 1 day remaining', () => {
    expect(recordationRenewalCountdownState(1)).toBe('critical');
  });

  it('critical on expiration day itself (0 days)', () => {
    expect(recordationRenewalCountdownState(0)).toBe('critical');
  });

  it('grace at 1 day past expiration', () => {
    expect(recordationRenewalCountdownState(-1)).toBe('grace');
  });

  it('grace at 45 days past expiration (mid grace period)', () => {
    expect(recordationRenewalCountdownState(-45)).toBe('grace');
  });

  it('grace at final day of grace period (-90 days)', () => {
    expect(recordationRenewalCountdownState(-RECORDATION_GRACE_DAYS)).toBe('grace');
  });

  it('missed at 91 days past expiration (one past grace end)', () => {
    expect(recordationRenewalCountdownState(-(RECORDATION_GRACE_DAYS + 1))).toBe('missed');
  });

  it('missed at 365 days past expiration', () => {
    expect(recordationRenewalCountdownState(-365)).toBe('missed');
  });
});

describe('countdown state constants', () => {
  it('DETENTION_RESPONSE_BD matches 19 C.F.R. § 133.21(b)(2)(i)', () => {
    expect(DETENTION_RESPONSE_BD).toBe(7);
  });

  it('SEIZURE_DISCLOSURE_BD matches 19 C.F.R. § 133.21(e)', () => {
    expect(SEIZURE_DISCLOSURE_BD).toBe(30);
  });

  it('RECORDATION_GRACE_DAYS matches the 90-day CBP grace window', () => {
    expect(RECORDATION_GRACE_DAYS).toBe(90);
  });
});

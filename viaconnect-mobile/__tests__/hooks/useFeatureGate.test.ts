/**
 * Tests for useFeatureGate hook — feature gating, variant limits, token multipliers.
 */
import { renderHook } from '@testing-library/react-native';
import { GENETIC_VARIANT_LIMITS, TOKEN_MULTIPLIERS } from '../../src/hooks/useFeatureGate';

// Mock the dependency chain
const mockUseSubscription = jest.fn();
jest.mock('../../src/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

import { useFeatureGate } from '../../src/hooks/useFeatureGate';

function setTier(tier: string) {
  mockUseSubscription.mockReturnValue({
    tier,
    isSubscribed: tier !== 'free',
    isLoading: false,
  });
}

describe('useFeatureGate', () => {
  afterEach(() => jest.clearAllMocks());

  describe('free tier features', () => {
    beforeEach(() => setTier('free'));

    it('can access caq and product_catalog', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.can('caq')).toBe(true);
      expect(result.current.can('product_catalog')).toBe(true);
      expect(result.current.can('genetic_preview')).toBe(true);
    });

    it('cannot access paid features', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.can('genetic_full')).toBe(false);
      expect(result.current.can('ai_advisor')).toBe(false);
      expect(result.current.can('patient_management')).toBe(false);
    });

    it('reports isPaid = false', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.isPaid).toBe(false);
    });
  });

  describe('gold tier features', () => {
    beforeEach(() => setTier('gold'));

    it('can access gold features', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.can('genetic_full')).toBe(true);
      expect(result.current.can('supplement_tracker')).toBe(true);
      expect(result.current.can('via_tokens')).toBe(true);
    });

    it('cannot access platinum features', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.can('ai_advisor')).toBe(false);
      expect(result.current.can('interaction_checker')).toBe(false);
      expect(result.current.can('via_tokens_2x')).toBe(false);
    });
  });

  describe('practitioner tier features', () => {
    beforeEach(() => setTier('practitioner'));

    it('can access all features', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.can('patient_management')).toBe(true);
      expect(result.current.can('protocol_builder')).toBe(true);
      expect(result.current.can('practice_analytics')).toBe(true);
      expect(result.current.can('ai_advisor')).toBe(true);
      expect(result.current.can('export_data')).toBe(true);
      expect(result.current.can('secure_messaging')).toBe(true);
    });
  });

  describe('requiredTier', () => {
    beforeEach(() => setTier('free'));

    it('returns free for caq', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.requiredTier('caq')).toBe('free');
    });

    it('returns gold for genetic_full', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.requiredTier('genetic_full')).toBe('gold');
    });

    it('returns platinum for ai_advisor', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.requiredTier('ai_advisor')).toBe('platinum');
    });

    it('returns practitioner for patient_management', () => {
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.requiredTier('patient_management')).toBe('practitioner');
    });
  });

  describe('variant limits', () => {
    it('free tier gets 3 variants', () => {
      setTier('free');
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.variantLimit).toBe(3);
    });

    it('gold tier gets unlimited variants', () => {
      setTier('gold');
      const { result } = renderHook(() => useFeatureGate());
      expect(result.current.variantLimit).toBe(Infinity);
    });
  });

  describe('token multipliers', () => {
    it('free/gold get 1x', () => {
      setTier('free');
      const { result: r1 } = renderHook(() => useFeatureGate());
      expect(r1.current.tokenMultiplier).toBe(1);

      setTier('gold');
      const { result: r2 } = renderHook(() => useFeatureGate());
      expect(r2.current.tokenMultiplier).toBe(1);
    });

    it('platinum/practitioner get 2x', () => {
      setTier('platinum');
      const { result: r1 } = renderHook(() => useFeatureGate());
      expect(r1.current.tokenMultiplier).toBe(2);

      setTier('practitioner');
      const { result: r2 } = renderHook(() => useFeatureGate());
      expect(r2.current.tokenMultiplier).toBe(2);
    });
  });

  describe('exported constants', () => {
    it('GENETIC_VARIANT_LIMITS has correct values', () => {
      expect(GENETIC_VARIANT_LIMITS.free).toBe(3);
      expect(GENETIC_VARIANT_LIMITS.gold).toBe(Infinity);
      expect(GENETIC_VARIANT_LIMITS.platinum).toBe(Infinity);
      expect(GENETIC_VARIANT_LIMITS.practitioner).toBe(Infinity);
    });

    it('TOKEN_MULTIPLIERS has correct values', () => {
      expect(TOKEN_MULTIPLIERS.free).toBe(1);
      expect(TOKEN_MULTIPLIERS.gold).toBe(1);
      expect(TOKEN_MULTIPLIERS.platinum).toBe(2);
      expect(TOKEN_MULTIPLIERS.practitioner).toBe(2);
    });
  });
});

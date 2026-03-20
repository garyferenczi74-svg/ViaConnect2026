/**
 * Tests for useEntitlements hook — verifies tier-based feature gating.
 */
import { renderHook } from '@testing-library/react-native';

// Mock useSubscription before importing useEntitlements
const mockUseSubscription = jest.fn();
jest.mock('../../src/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

import { useEntitlements } from '../../src/hooks/useEntitlements';

function setTier(tier: string) {
  mockUseSubscription.mockReturnValue({
    tier,
    isSubscribed: tier !== 'free',
    isLoading: false,
  });
}

describe('useEntitlements', () => {
  afterEach(() => jest.clearAllMocks());

  describe('free tier', () => {
    beforeEach(() => setTier('free'));

    it('disables all paid features', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.canViewFullGenetics).toBe(false);
      expect(result.current.canUseSupplementTracker).toBe(false);
      expect(result.current.canEarnViaTokens).toBe(false);
      expect(result.current.canUseAIAdvisor).toBe(false);
      expect(result.current.canUseInteractionChecker).toBe(false);
      expect(result.current.canManagePatients).toBe(false);
    });

    it('limits genetic variants to 3', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.maxGeneticVariantsPreview).toBe(3);
    });

    it('reports not subscribed', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.tier).toBe('free');
    });
  });

  describe('gold tier', () => {
    beforeEach(() => setTier('gold'));

    it('enables gold features', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.canViewFullGenetics).toBe(true);
      expect(result.current.canUseSupplementTracker).toBe(true);
      expect(result.current.canEarnViaTokens).toBe(true);
    });

    it('disables platinum features', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.canUseAIAdvisor).toBe(false);
      expect(result.current.canUseInteractionChecker).toBe(false);
      expect(result.current.doubleTokenEarning).toBe(false);
    });

    it('gives unlimited variant preview', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.maxGeneticVariantsPreview).toBe(Infinity);
    });
  });

  describe('platinum tier', () => {
    beforeEach(() => setTier('platinum'));

    it('enables all consumer features', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.canViewFullGenetics).toBe(true);
      expect(result.current.canUseAIAdvisor).toBe(true);
      expect(result.current.canUseInteractionChecker).toBe(true);
      expect(result.current.canViewFullAnalytics).toBe(true);
      expect(result.current.doubleTokenEarning).toBe(true);
    });

    it('disables practitioner features', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.canManagePatients).toBe(false);
      expect(result.current.canBuildProtocols).toBe(false);
      expect(result.current.canViewPracticeAnalytics).toBe(false);
    });
  });

  describe('practitioner tier', () => {
    beforeEach(() => setTier('practitioner'));

    it('enables all features', () => {
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.canViewFullGenetics).toBe(true);
      expect(result.current.canUseAIAdvisor).toBe(true);
      expect(result.current.canManagePatients).toBe(true);
      expect(result.current.canBuildProtocols).toBe(true);
      expect(result.current.canViewPracticeAnalytics).toBe(true);
      expect(result.current.doubleTokenEarning).toBe(true);
    });
  });

  describe('loading state', () => {
    it('passes through isLoading', () => {
      mockUseSubscription.mockReturnValue({
        tier: 'free',
        isSubscribed: false,
        isLoading: true,
      });
      const { result } = renderHook(() => useEntitlements());
      expect(result.current.isLoading).toBe(true);
    });
  });
});

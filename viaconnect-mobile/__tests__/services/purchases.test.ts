/**
 * Tests for RevenueCat purchases service wrapper.
 */
import Purchases from 'react-native-purchases';
import {
  initializePurchases,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  hasEntitlement,
  logoutPurchases,
} from '../../src/services/purchases';

describe('purchases service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('initializePurchases', () => {
    it('configures SDK and sets log level', async () => {
      await initializePurchases();
      expect(Purchases.setLogLevel).toHaveBeenCalled();
    });

    it('logs in user when userId provided', async () => {
      await initializePurchases('user-123');
      expect(Purchases.logIn).toHaveBeenCalledWith('user-123');
    });

    it('does not call logIn when no userId', async () => {
      await initializePurchases();
      expect(Purchases.logIn).not.toHaveBeenCalled();
    });

    it('handles initialization errors gracefully', async () => {
      (Purchases.configure as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Init failed');
      });
      // Should not throw
      await initializePurchases();
    });
  });

  describe('getOfferings', () => {
    it('returns current offering', async () => {
      const mockOffering = { monthly: {}, annual: {} };
      (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce({
        current: mockOffering,
      });
      const result = await getOfferings();
      expect(result).toEqual(mockOffering);
    });

    it('returns null on error', async () => {
      (Purchases.getOfferings as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );
      const result = await getOfferings();
      expect(result).toBeNull();
    });
  });

  describe('purchasePackage', () => {
    it('returns customerInfo on success', async () => {
      const mockInfo = { entitlements: { active: { gold: {} } } };
      (Purchases.purchasePackage as jest.Mock).mockResolvedValueOnce({
        customerInfo: mockInfo,
      });
      const result = await purchasePackage({} as any);
      expect(result).toEqual(mockInfo);
    });

    it('returns null on user cancellation', async () => {
      (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce({
        userCancelled: true,
      });
      const result = await purchasePackage({} as any);
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce(
        new Error('Purchase failed'),
      );
      const result = await purchasePackage({} as any);
      expect(result).toBeNull();
    });
  });

  describe('restorePurchases', () => {
    it('returns customerInfo on success', async () => {
      const mockInfo = { entitlements: { active: {} } };
      (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce(mockInfo);
      const result = await restorePurchases();
      expect(result).toEqual(mockInfo);
    });

    it('returns null on error', async () => {
      (Purchases.restorePurchases as jest.Mock).mockRejectedValueOnce(
        new Error('Restore failed'),
      );
      const result = await restorePurchases();
      expect(result).toBeNull();
    });
  });

  describe('getCustomerInfo', () => {
    it('returns customerInfo', async () => {
      const mockInfo = { entitlements: { active: {} } };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockInfo);
      const result = await getCustomerInfo();
      expect(result).toEqual(mockInfo);
    });

    it('returns null on error', async () => {
      (Purchases.getCustomerInfo as jest.Mock).mockRejectedValueOnce(
        new Error('Error'),
      );
      const result = await getCustomerInfo();
      expect(result).toBeNull();
    });
  });

  describe('hasEntitlement', () => {
    it('returns true for active entitlement', () => {
      const info = {
        entitlements: {
          active: { viaconnect_gold: { isActive: true } },
        },
      } as any;
      expect(hasEntitlement(info, 'viaconnect_gold')).toBe(true);
    });

    it('returns false for missing entitlement', () => {
      const info = { entitlements: { active: {} } } as any;
      expect(hasEntitlement(info, 'viaconnect_gold')).toBe(false);
    });
  });

  describe('logoutPurchases', () => {
    it('calls Purchases.logOut', async () => {
      await logoutPurchases();
      expect(Purchases.logOut).toHaveBeenCalled();
    });

    it('handles error gracefully', async () => {
      (Purchases.logOut as jest.Mock).mockRejectedValueOnce(
        new Error('Logout failed'),
      );
      await logoutPurchases(); // Should not throw
    });
  });
});

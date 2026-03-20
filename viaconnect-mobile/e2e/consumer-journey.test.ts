/**
 * ViaConnect GeneX360 — Consumer Portal E2E Test Spec
 *
 * Detox end-to-end test for the consumer user journey.
 * Run with: detox test --configuration ios.sim.release
 */

describe('Consumer Journey', () => {
  beforeAll(async () => {
    // @ts-ignore - Detox global
    await device.launchApp({ newInstance: true });
  });

  describe('Onboarding & Auth', () => {
    it('should show welcome screen on first launch', async () => {
      // @ts-ignore
      await expect(element(by.text('ViaConnect GeneX360'))).toBeVisible();
    });

    it('should navigate to sign-up screen', async () => {
      // @ts-ignore
      await element(by.text('Get Started')).tap();
      // @ts-ignore
      await expect(element(by.text('Create Account'))).toBeVisible();
    });

    it('should sign up with email and password', async () => {
      // @ts-ignore
      await element(by.id('email-input')).typeText('test@example.com');
      // @ts-ignore
      await element(by.id('password-input')).typeText('SecureP@ss123');
      // @ts-ignore
      await element(by.text('Sign Up')).tap();
    });

    it('should complete CAQ wizard', async () => {
      // @ts-ignore
      await expect(element(by.text('Clinical Assessment'))).toBeVisible();
      // Complete each step of the CAQ wizard
      // @ts-ignore
      await element(by.text('Next')).tap();
      // @ts-ignore
      await element(by.text('Next')).tap();
      // @ts-ignore
      await element(by.text('Submit')).tap();
    });
  });

  describe('Consumer Dashboard', () => {
    it('should display personalized dashboard', async () => {
      // @ts-ignore
      await expect(element(by.text('Personal Wellness'))).toBeVisible();
    });

    it('should show wellness score', async () => {
      // @ts-ignore
      await expect(element(by.id('wellness-score'))).toBeVisible();
    });

    it('should show genetic preview (max 3 for free)', async () => {
      // @ts-ignore
      await expect(element(by.id('gene-preview-section'))).toBeVisible();
    });

    it('should show ViaToken balance', async () => {
      // @ts-ignore
      await expect(element(by.text('ViaTokens'))).toBeVisible();
    });
  });

  describe('Supplement Tracker', () => {
    it('should navigate to supplement tracker', async () => {
      // @ts-ignore
      await element(by.text('Supplements')).tap();
      // @ts-ignore
      await expect(element(by.text('Today\'s Protocol'))).toBeVisible();
    });

    it('should mark supplement as taken', async () => {
      // @ts-ignore
      await element(by.id('supplement-check-0')).tap();
      // @ts-ignore
      await expect(element(by.id('supplement-check-0'))).toHaveToggleValue(true);
    });
  });

  describe('Product Catalog', () => {
    it('should browse product catalog', async () => {
      // @ts-ignore
      await element(by.text('Shop')).tap();
      // @ts-ignore
      await expect(element(by.text('MTHFR+'))).toBeVisible();
    });

    it('should filter by category', async () => {
      // @ts-ignore
      await element(by.text('Methylation')).tap();
      // @ts-ignore
      await expect(element(by.text('MTHFR+'))).toBeVisible();
    });
  });

  describe('Paywall & Upgrade', () => {
    it('should show locked overlay for full genetics', async () => {
      // @ts-ignore
      await element(by.text('Genetics')).tap();
      // @ts-ignore
      await expect(element(by.text('Upgrade to Gold'))).toBeVisible();
    });

    it('should show paywall with tier options', async () => {
      // @ts-ignore
      await element(by.text('Upgrade to Gold')).tap();
      // @ts-ignore
      await expect(element(by.text('$8.88/mo'))).toBeVisible();
      // @ts-ignore
      await expect(element(by.text('$28.88/mo'))).toBeVisible();
    });
  });

  describe('Settings', () => {
    it('should navigate to settings', async () => {
      // @ts-ignore
      await element(by.text('Settings')).tap();
      // @ts-ignore
      await expect(element(by.text('Profile'))).toBeVisible();
    });

    it('should sign out', async () => {
      // @ts-ignore
      await element(by.text('Sign Out')).tap();
      // @ts-ignore
      await expect(element(by.text('ViaConnect GeneX360'))).toBeVisible();
    });
  });
});

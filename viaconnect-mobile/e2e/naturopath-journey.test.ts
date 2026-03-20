/**
 * ViaConnect GeneX360 — Naturopath Portal E2E Test Spec
 *
 * Detox end-to-end test for the naturopath user journey.
 */

describe('Naturopath Journey', () => {
  beforeAll(async () => {
    // @ts-ignore
    await device.launchApp({ newInstance: true });
  });

  describe('Auth', () => {
    it('should sign in as naturopath', async () => {
      // @ts-ignore
      await element(by.text('Sign In')).tap();
      // @ts-ignore
      await element(by.id('email-input')).typeText('naturopath@viaconnect.com');
      // @ts-ignore
      await element(by.id('password-input')).typeText('SecureP@ss123');
      // @ts-ignore
      await element(by.text('Sign In')).tap();
    });
  });

  describe('Naturopath Dashboard', () => {
    it('should display naturopath dashboard', async () => {
      // @ts-ignore
      await expect(element(by.text('Naturopathic Portal'))).toBeVisible();
    });

    it('should show active patients count', async () => {
      // @ts-ignore
      await expect(element(by.id('active-patients'))).toBeVisible();
    });

    it('should show therapeutic order section', async () => {
      // @ts-ignore
      await expect(element(by.text('Therapeutic Order'))).toBeVisible();
    });
  });

  describe('Botanical Search', () => {
    it('should navigate to botanical database', async () => {
      // @ts-ignore
      await element(by.text('Botanicals')).tap();
      // @ts-ignore
      await expect(element(by.text('Botanical Database'))).toBeVisible();
    });

    it('should search for a botanical', async () => {
      // @ts-ignore
      await element(by.id('botanical-search')).typeText('Ashwagandha');
      // @ts-ignore
      await expect(element(by.text('Withania somnifera'))).toBeVisible();
    });
  });

  describe('Constitutional Assessment', () => {
    it('should view constitutional types', async () => {
      // @ts-ignore
      await element(by.text('Constitution')).tap();
      // @ts-ignore
      await expect(element(by.text('Constitutional Assessment'))).toBeVisible();
    });

    it('should switch between Ayurvedic and TCM systems', async () => {
      // @ts-ignore
      await element(by.text('Ayurvedic')).tap();
      // @ts-ignore
      await expect(element(by.text('Vata'))).toBeVisible();
      // @ts-ignore
      await element(by.text('TCM')).tap();
      // @ts-ignore
      await expect(element(by.text('Qi'))).toBeVisible();
    });
  });

  describe('Patient Management', () => {
    it('should view patient list', async () => {
      // @ts-ignore
      await element(by.text('Patients')).tap();
      // @ts-ignore
      await expect(element(by.id('patient-list'))).toBeVisible();
    });

    it('should create vitality assessment', async () => {
      // @ts-ignore
      await element(by.text('New Assessment')).tap();
      // @ts-ignore
      await expect(element(by.text('Vitality Score'))).toBeVisible();
    });
  });
});

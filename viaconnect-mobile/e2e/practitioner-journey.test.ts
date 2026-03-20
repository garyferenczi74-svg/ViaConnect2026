/**
 * ViaConnect GeneX360 — Practitioner Portal E2E Test Spec
 *
 * Detox end-to-end test for the practitioner user journey.
 */

describe('Practitioner Journey', () => {
  beforeAll(async () => {
    // @ts-ignore
    await device.launchApp({ newInstance: true });
  });

  describe('Auth', () => {
    it('should sign in as practitioner', async () => {
      // @ts-ignore
      await element(by.text('Sign In')).tap();
      // @ts-ignore
      await element(by.id('email-input')).typeText('dr.vasquez@precisionwellness.com');
      // @ts-ignore
      await element(by.id('password-input')).typeText('SecureP@ss123');
      // @ts-ignore
      await element(by.text('Sign In')).tap();
    });
  });

  describe('Practitioner Dashboard', () => {
    it('should display practitioner dashboard', async () => {
      // @ts-ignore
      await expect(element(by.text('Practitioner Dashboard'))).toBeVisible();
    });

    it('should show patient count and high risk alerts', async () => {
      // @ts-ignore
      await expect(element(by.id('patient-count'))).toBeVisible();
      // @ts-ignore
      await expect(element(by.id('high-risk-count'))).toBeVisible();
    });

    it('should show upcoming appointments', async () => {
      // @ts-ignore
      await expect(element(by.id('schedule-section'))).toBeVisible();
    });
  });

  describe('Patient Management', () => {
    it('should navigate to patient list', async () => {
      // @ts-ignore
      await element(by.text('Patients')).tap();
      // @ts-ignore
      await expect(element(by.text('Sarah Chen'))).toBeVisible();
    });

    it('should open patient detail', async () => {
      // @ts-ignore
      await element(by.text('Sarah Chen')).tap();
      // @ts-ignore
      await expect(element(by.text('Patient Profile'))).toBeVisible();
    });

    it('should show patient genetic data', async () => {
      // @ts-ignore
      await element(by.text('Genetics')).tap();
      // @ts-ignore
      await expect(element(by.text('MTHFR'))).toBeVisible();
    });
  });

  describe('Genomics Panel', () => {
    it('should navigate to genomics deep dive', async () => {
      // @ts-ignore
      await element(by.text('Genomics')).tap();
      // @ts-ignore
      await expect(element(by.text('Gene & Variant Explorer'))).toBeVisible();
    });

    it('should search for a gene', async () => {
      // @ts-ignore
      await element(by.id('search-genomics')).typeText('MTHFR');
      // @ts-ignore
      await expect(element(by.text('Methylation'))).toBeVisible();
    });

    it('should expand gene to see variants', async () => {
      // @ts-ignore
      await element(by.text('MTHFR')).tap();
      // @ts-ignore
      await expect(element(by.text('Clinical Note'))).toBeVisible();
      // @ts-ignore
      await expect(element(by.text('Patient Variants'))).toBeVisible();
    });
  });

  describe('Protocol Builder', () => {
    it('should navigate to protocols', async () => {
      // @ts-ignore
      await element(by.text('Protocols')).tap();
      // @ts-ignore
      await expect(element(by.text('Active Protocols'))).toBeVisible();
    });

    it('should create new protocol', async () => {
      // @ts-ignore
      await element(by.text('New Protocol')).tap();
      // @ts-ignore
      await element(by.id('protocol-name')).typeText('MTHFR Support');
      // @ts-ignore
      await element(by.text('Add Supplement')).tap();
      // @ts-ignore
      await element(by.text('MTHFR+')).tap();
      // @ts-ignore
      await element(by.text('Save Protocol')).tap();
    });
  });

  describe('AI Clinical Advisor', () => {
    it('should navigate to AI advisor', async () => {
      // @ts-ignore
      await element(by.text('AI Advisor')).tap();
      // @ts-ignore
      await expect(element(by.text('Clinical AI'))).toBeVisible();
    });

    it('should submit a clinical query', async () => {
      // @ts-ignore
      await element(by.id('ai-query-input')).typeText(
        'What are the interaction risks for MTHFR C677T homozygous patient on methotrexate?',
      );
      // @ts-ignore
      await element(by.text('Ask')).tap();
      // Wait for AI response
      // @ts-ignore
      await waitFor(element(by.id('ai-response')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Interaction Checker', () => {
    it('should navigate to interaction checker', async () => {
      // @ts-ignore
      await element(by.text('Interactions')).tap();
      // @ts-ignore
      await expect(element(by.text('Interaction Checker'))).toBeVisible();
    });

    it('should check for interactions', async () => {
      // @ts-ignore
      await element(by.id('supplement-input')).typeText('MTHFR+');
      // @ts-ignore
      await element(by.id('medication-input')).typeText('Methotrexate');
      // @ts-ignore
      await element(by.text('Check Interactions')).tap();
      // @ts-ignore
      await expect(element(by.id('interaction-results'))).toBeVisible();
    });
  });

  describe('Settings & Audit', () => {
    it('should show audit trail', async () => {
      // @ts-ignore
      await element(by.text('Settings')).tap();
      // @ts-ignore
      await expect(element(by.text('Audit Trail'))).toBeVisible();
    });

    it('should show API usage metrics', async () => {
      // @ts-ignore
      await expect(element(by.text('API Usage'))).toBeVisible();
    });
  });
});

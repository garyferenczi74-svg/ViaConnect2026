/**
 * Analytics tracking helpers.
 *
 * TODO(human): wire up an actual analytics provider.
 * Common options: @vercel/analytics, PostHog, Plausible, Mixpanel, Segment.
 *
 * Until a provider is wired, the helpers below are no-ops in production
 * and log to console in development for visibility.
 */

export function trackPractitionerPricingExpanded() {
    if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[analytics] practitioner_pricing_expanded')
    }
    // TODO(human): replace with real analytics call once a provider is wired.
}

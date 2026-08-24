import { redirect } from 'next/navigation';

/**
 * Brief 13: /wellness-analytics is retired as the consumer analytics IA.
 * The emoji 10-category grid is no longer the destination.
 * Consumer analytics lives at /analytics (Your Journey).
 * Hydration logging remains at /wellness-analytics/hydration.
 */
export default function WellnessAnalyticsRedirectPage() {
  redirect('/analytics');
}

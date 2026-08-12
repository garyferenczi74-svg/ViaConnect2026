/**
 * All /api/* handlers are request-time (auth cookies, webhooks, cron).
 * Segment-level force-dynamic skips static page-data collection for ~365
 * route handlers, which was a major contributor to multi-minute Vercel builds.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { notFound } from "next/navigation";

/**
 * Brief 36: unmatched signed-in URLs must enter the (app) segment.
 * Root not-found.tsx sits outside (app) and would otherwise skip
 * PortalShellRouter. This catch-all is wrapped by (app)/layout, then
 * notFound() renders (app)/not-found.tsx inside that shell.
 *
 * next.config redirects still win for /helix-rewards, /rewards, and
 * /admin/command-center (Brief 43 alias to /admin/jeffery).
 */
export default function AppUnmatchedPath() {
  notFound();
}

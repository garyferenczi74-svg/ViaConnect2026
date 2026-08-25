import { AppNotFoundView } from "@/components/not-found/AppNotFoundView";

/**
 * Brief 36: signed-in 404 for notFound() inside (app).
 * (app)/layout already wraps this with AdminPortalDetector / PortalShellRouter
 * (sidebar, top bar, navy+orange V logo). Do not reimplement chrome here.
 */
export default function AppGroupNotFound() {
  return <AppNotFoundView />;
}

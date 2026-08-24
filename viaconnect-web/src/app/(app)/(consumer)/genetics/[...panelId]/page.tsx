// Brief 17: kill fabricated /genetics/{slug} panels.
// Allowlist only (PANEL_ROUTE_ALLOWLIST). Known catalog slugs redirect to
// BLUEPRINT_ROUTE hashes. Unknown slugs call notFound() so the genetics
// app-shell 404 renders instead of a fake panel page.

import { notFound, redirect } from 'next/navigation';
import { blueprintHrefForPanelPath } from '@/lib/genetics/panelRoute';

export default async function GeneticsPanelCatchAll({
  params,
}: {
  params: Promise<{ panelId: string[] }>;
}) {
  const { panelId } = await params;
  const href = blueprintHrefForPanelPath(panelId);
  if (href) redirect(href);
  notFound();
}

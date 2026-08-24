// Brief 17: kill fabricated /genetics/{slug} panels.
// Known catalog slugs (genex-m, nutrigen-dx, and aliases) redirect to
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

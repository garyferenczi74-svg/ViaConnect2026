// BOSCard: Server Component shell for the Bio Optimization Score card.
//
// The dashboard page imports this component. It renders the client
// island, which handles data fetching via react-query. Holding the
// shell server-side keeps the import surface small and means the
// consumer never imports the client hook tree until React reaches the
// island boundary.
//
// Note: the dashboard page is already 'use client' (per existing
// codebase pattern), so this shell does not need to inject the
// QueryClientProvider itself. The app-wide provider is established at
// the layout level.

import { BOSCardClient } from './bos-card-client';

export function BOSCard() {
  return <BOSCardClient />;
}

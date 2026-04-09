// Research Hub — cross-page event bus.
// Uses BroadcastChannel so the Dashboard's DailyInsightsCard can refresh
// the moment the user toggles a source on the Research Hub page (works
// across tabs in the same browser too). SSR-safe.

const CHANNEL_NAME = 'research-hub';

export type ResearchHubEvent =
  | { type: 'source-toggled'; sourceId: string; isActive: boolean }
  | { type: 'source-added'; sourceId: string }
  | { type: 'source-removed'; sourceId: string }
  | { type: 'tab-toggled'; categoryId: string; isActive: boolean }
  | { type: 'item-updated'; itemId: string };

type Listener = (event: ResearchHubEvent) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener('message', (e) => {
    const payload = e.data as ResearchHubEvent;
    listeners.forEach((l) => l(payload));
  });
  return channel;
}

/** Broadcast an event to all open Research Hub pages + Dashboard cards. */
export function emitResearchHubEvent(event: ResearchHubEvent): void {
  // Same-tab listeners (BroadcastChannel doesn't deliver to itself)
  listeners.forEach((l) => l(event));
  // Cross-tab via BroadcastChannel
  const ch = getChannel();
  if (ch) ch.postMessage(event);
}

/** Subscribe to Research Hub events. Returns an unsubscribe function. */
export function subscribeResearchHub(listener: Listener): () => void {
  getChannel(); // ensure channel is open
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

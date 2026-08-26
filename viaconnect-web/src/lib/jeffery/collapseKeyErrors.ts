/**
 * Display-only collapse of repeated ANTHROPIC_API_KEY errors.
 * Does not set or resolve the secret. Keeps the first-seen created_at.
 */

const KEY_ERROR = /ANTHROPIC_API_KEY not set/i;

export function isAnthropicKeyError(row: { title?: string; summary?: string }): boolean {
  return KEY_ERROR.test(`${row.title ?? ""} ${row.summary ?? ""}`);
}

export function collapseDuplicateKeyErrors<
  T extends { id: string; title: string; summary: string; created_at: string },
>(messages: T[]): T[] {
  const firstSeen = new Map<string, T>();
  const drop = new Set<string>();
  for (const m of messages) {
    if (!isAnthropicKeyError(m)) continue;
    const key = `${m.title}\0${m.summary}`;
    const prev = firstSeen.get(key);
    if (!prev) {
      firstSeen.set(key, m);
      continue;
    }
    if (m.created_at < prev.created_at) {
      drop.add(prev.id);
      firstSeen.set(key, m);
    } else {
      drop.add(m.id);
    }
  }
  return messages.filter((m) => !drop.has(m.id));
}

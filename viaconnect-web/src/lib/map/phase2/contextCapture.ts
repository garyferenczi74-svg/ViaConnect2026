// Prompt #101 Workstream A — shared shape for post/chat context archives.

export interface PostContext {
  kind: 'post_comments' | 'chat_messages';
  capturedAt: string;
  topLevelText: string;
  surrounding: Array<{
    authorId: string | null;
    authorDisplayName: string | null;
    text: string;
    timestamp: string;
  }>;
}

/** Pure: serialize a PostContext to the JSONB shape stored in
 *  post_context_storage_path. */
export function serializePostContext(context: PostContext): string {
  return JSON.stringify(context);
}

/** Pure: deserialize + validate shape. Returns null for malformed. */
export function deserializePostContext(raw: string): PostContext | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PostContext>;
    if (!parsed.kind || !parsed.capturedAt || !Array.isArray(parsed.surrounding)) return null;
    if (parsed.kind !== 'post_comments' && parsed.kind !== 'chat_messages') return null;
    return parsed as PostContext;
  } catch {
    return null;
  }
}

/** Pure: contains the practitioner's verified account in the author
 *  set? Used to confirm attribution before a Telegram/Discord/Reddit
 *  observation becomes a violation. */
export function contextAttributableToPractitioner(
  context: PostContext,
  practitionerVerifiedAccountIds: readonly string[],
): boolean {
  return context.surrounding.some(
    (entry) => entry.authorId !== null && practitionerVerifiedAccountIds.includes(entry.authorId),
  );
}

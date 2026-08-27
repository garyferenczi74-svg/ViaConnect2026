/**
 * Display/history hygiene for persisted Hannah advisor turns.
 *
 * Old not-configured / supabase-secrets assistant copy (and the current
 * streamer fallback that names ANTHROPIC_API_KEY) can sit in
 * ultrathink_advisor_conversations and reload as a live reply. This helper
 * is client-safe: it only rewrites what the chat UI shows. It does not
 * delete rows, set secrets, or change the Anthropic integration.
 */

export interface AdvisorHistoryRow {
  id?: string | null;
  role: "user" | "assistant";
  content: string;
}

export interface HydratedAdvisorMessage extends AdvisorHistoryRow {
  isError?: boolean;
  retryText?: string;
}

/** Short honest bubble. Must never mention supabase secrets or API keys. */
export const STALE_ADVISOR_CONFIG_DISPLAY_ERROR =
  "Hannah could not complete that earlier reply. Retry to send the same question again.";

const OLD_NOT_CONFIGURED = /i['’]m not configured yet/i;
const SUPABASE_SECRETS_SET_KEY = /supabase secrets set\s+ANTHROPIC_API_KEY/i;
const CURRENT_FALLBACK_KEY_HINT =
  /ANTHROPIC_API_KEY is set for this environment/i;
const CURRENT_FALLBACK_UNABLE = /temporarily unable to reach the AI provider/i;

function normalizeAdvisorCopy(content: string): string {
  return content
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function isStaleAdvisorConfigCopy(content: string): boolean {
  const text = normalizeAdvisorCopy(content);
  if (!text) return false;
  if (SUPABASE_SECRETS_SET_KEY.test(text)) return true;
  if (OLD_NOT_CONFIGURED.test(text) && /ANTHROPIC_API_KEY/i.test(text)) return true;
  if (CURRENT_FALLBACK_KEY_HINT.test(text)) return true;
  return CURRENT_FALLBACK_UNABLE.test(text) && /ANTHROPIC_API_KEY/i.test(text);
}

export function lastUserRetryText(
  messages: readonly Pick<HydratedAdvisorMessage, "role" | "content">[]
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i];
    if (row.role === "user" && row.content.trim()) {
      return row.content;
    }
  }
  return undefined;
}

export function displayAdvisorAssistantMessage(
  content: string,
  opts?: { id?: string | null; retryText?: string }
): HydratedAdvisorMessage {
  if (isStaleAdvisorConfigCopy(content)) {
    return {
      role: "assistant",
      content: STALE_ADVISOR_CONFIG_DISPLAY_ERROR,
      id: opts?.id,
      isError: true,
      retryText: opts?.retryText,
    };
  }
  return {
    role: "assistant",
    content,
    id: opts?.id,
  };
}

export function hydrateAdvisorHistoryMessages(
  rows: readonly AdvisorHistoryRow[]
): HydratedAdvisorMessage[] {
  const out: HydratedAdvisorMessage[] = [];
  for (const row of rows) {
    if (row.role === "user") {
      out.push({ role: "user", content: row.content, id: row.id });
      continue;
    }
    out.push(
      displayAdvisorAssistantMessage(row.content, {
        id: row.id,
        retryText: lastUserRetryText(out),
      })
    );
  }
  return out;
}

export function isLiveAssistantReply(
  message: Pick<HydratedAdvisorMessage, "role" | "isError"> | undefined
): boolean {
  return message?.role === "assistant" && !message.isError;
}

export function shouldShowSuggestedPrompts(
  messages: readonly Pick<HydratedAdvisorMessage, "role" | "isError">[]
): boolean {
  return isLiveAssistantReply(messages[messages.length - 1]);
}

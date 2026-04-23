// Prompt #112 — Slack adapter.
// Workspace OAuth access tokens are stored via vault_ref; resolve via the
// Supabase Vault API (admin) at send time. unfurl suppression enforced for
// every chat.postMessage call. Attorney-work-product bypass is enforced by
// the dispatcher, not the adapter.

export interface SlackBlock { [key: string]: unknown }

export interface SlackPostResult {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
  http_status?: number;
  body_raw?: unknown;
}

export interface SlackPostParams {
  access_token: string;
  channel: string;
  text: string;
  blocks: SlackBlock[];
}

/**
 * Post a message via Slack Web API chat.postMessage. unfurl_links and
 * unfurl_media are forced to false to prevent Slack's URL preview from
 * fetching ViaConnect URLs with embedded deep-link context.
 */
export async function slackPostMessage(params: SlackPostParams): Promise<SlackPostResult> {
  const body = {
    channel: params.channel,
    text: params.text,
    blocks: params.blocks,
    unfurl_links: false,
    unfurl_media: false,
  };

  let resp: Response;
  try {
    resp = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        authorization: `Bearer ${params.access_token}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: "slack_fetch_failed", body_raw: String(e) };
  }
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { ok: false, error: "slack_http_error", http_status: resp.status, body_raw: json };
  }
  if (!json.ok) {
    return { ok: false, error: json.error ?? "slack_api_error", body_raw: json };
  }
  return { ok: true, ts: json.ts, channel: json.channel, body_raw: json };
}

/** Build a standard three-block Slack message: heading, context, CTA. */
export function buildSlackBlocks(args: {
  title: string;
  summary: string;
  deep_link_absolute_url: string;
  cta_text?: string;
}): SlackBlock[] {
  return [
    { type: "section", text: { type: "mrkdwn", text: `*${args.title}*` } },
    { type: "context", elements: [{ type: "mrkdwn", text: args.summary }] },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: args.cta_text ?? "Open in ViaConnect" },
          url: args.deep_link_absolute_url,
          style: "primary",
        },
      ],
    },
  ];
}

/** Slack OAuth v2 token exchange. Returns the raw Slack response body. */
export async function slackOAuthExchange(params: {
  client_id: string;
  client_secret: string;
  code: string;
  redirect_uri: string;
}): Promise<Record<string, unknown> | null> {
  const form = new URLSearchParams();
  form.set("client_id", params.client_id);
  form.set("client_secret", params.client_secret);
  form.set("code", params.code);
  form.set("redirect_uri", params.redirect_uri);

  const resp = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  if (!json.ok) return null;
  return json;
}

/** Slack Events API signature verification. */
export function verifySlackSignature(params: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}): boolean {
  if (!params.timestamp || !params.signature || !params.signingSecret) return false;
  const ageSec = Math.floor(Date.now() / 1000) - Number(params.timestamp);
  if (Math.abs(ageSec) > 60 * 5) return false;

  const base = `v0:${params.timestamp}:${params.rawBody}`;
  // Use Node's crypto in runtime; in tests this is pure.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  const h = crypto.createHmac("sha256", params.signingSecret).update(base).digest("hex");
  const expected = `v0=${h}`;
  if (expected.length !== params.signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
}

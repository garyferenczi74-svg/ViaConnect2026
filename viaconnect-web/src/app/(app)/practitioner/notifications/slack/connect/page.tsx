// Prompt #112 — Slack OAuth initiator.

import { Send, ExternalLink } from "lucide-react";

export default function Page() {
  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID ?? "";
  const redirectUri = process.env.NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URI ?? "";
  const scopes = ["chat:write", "im:write", "channels:read", "users:read"].join(",");
  const authUrl = clientId && redirectUri
    ? `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`
    : null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Send className="h-6 w-6 text-teal-300" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">Slack notifications</h2>
          <p className="text-sm text-slate-400">Connect a Slack workspace; default delivery goes to a DM to you.</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        {authUrl ? (
          <a
            href={authUrl}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
          >
            Connect Slack workspace
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </a>
        ) : (
          <p className="text-sm text-amber-300">Slack OAuth is not yet configured. An admin must set NEXT_PUBLIC_SLACK_CLIENT_ID + NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URI.</p>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Scopes requested: chat:write, im:write, channels:read, users:read. ViaConnect messages never unfurl URLs and omit patient identifiers; Slack workspace history is subject to your organisation&apos;s retention policy.
        </p>
      </div>
    </section>
  );
}

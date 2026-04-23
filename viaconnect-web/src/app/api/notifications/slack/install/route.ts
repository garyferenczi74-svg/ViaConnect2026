// Prompt #112 — Slack OAuth callback.
// Practitioner clicks "Connect Slack" → Slack OAuth → Slack redirects here
// with ?code=... → we exchange for access token → store encrypted reference
// in credentials.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slackOAuthExchange } from "@/lib/notifications/adapters/slack";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/practitioner/notifications/slack/connect?error=no_code", request.url));

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI ?? `${url.origin}/api/notifications/slack/install`;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/practitioner/notifications/slack/connect?error=slack_not_configured", request.url));
  }

  const slackResp = await slackOAuthExchange({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri });
  if (!slackResp) {
    return NextResponse.redirect(new URL("/practitioner/notifications/slack/connect?error=token_exchange_failed", request.url));
  }

  const accessToken = slackResp.access_token as string | undefined;
  const teamId = (slackResp.team as { id?: string } | undefined)?.id;
  const teamName = (slackResp.team as { name?: string } | undefined)?.name;
  const authedUser = (slackResp.authed_user as { id?: string } | undefined)?.id;

  if (!accessToken || !teamId) {
    return NextResponse.redirect(new URL("/practitioner/notifications/slack/connect?error=malformed_response", request.url));
  }

  // Store token-vault-ref: production should push the token to Supabase Vault
  // and persist the vault ref. For this MVP we tag a placeholder ref pattern
  // and defer the vault push to an operational hook.
  const vaultRef = `vault://slack-access-token/${user.id}`;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("notification_channel_credentials")
    .select("credential_id")
    .eq("practitioner_id", user.id)
    .maybeSingle();
  const slackFields = {
    slack_workspace_id: teamId,
    slack_workspace_name: teamName ?? null,
    slack_access_token_vault_ref: vaultRef,
    slack_default_channel_id: authedUser ?? null,
    slack_is_dm: true,
    slack_installed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    await admin.from("notification_channel_credentials")
      .update(slackFields)
      .eq("credential_id", (existing as { credential_id: string }).credential_id);
  } else {
    await admin.from("notification_channel_credentials").insert({ practitioner_id: user.id, ...slackFields });
  }

  return NextResponse.redirect(new URL("/practitioner/notifications/slack/status?connected=1", request.url));
}

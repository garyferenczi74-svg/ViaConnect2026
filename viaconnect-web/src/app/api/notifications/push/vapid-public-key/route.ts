// Prompt #112 — Serves the VAPID public key so the browser Service Worker
// can subscribe. Key is provisioned in Supabase Vault and exposed via env.

import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "vapid_not_configured" }, { status: 503 });
  return NextResponse.json({ ok: true, public_key: key });
}

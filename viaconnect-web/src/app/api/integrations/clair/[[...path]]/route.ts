// Fail-closed Clair Health integration scaffold.
// Returns 501 / not_configured until real CLAIR_* secrets and partner OAuth
// exist. No hardcoded credentials. Partner domain is wearclair.com only.

import { NextResponse } from 'next/server';
import { isClairConfigured } from '@/lib/wearables/clair/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function notConfigured(): NextResponse {
  return NextResponse.json(
    { error: 'not_configured', configured: isClairConfigured() },
    { status: 501 },
  );
}

export async function GET(): Promise<NextResponse> {
  return notConfigured();
}

export async function POST(): Promise<NextResponse> {
  return notConfigured();
}

export async function PUT(): Promise<NextResponse> {
  return notConfigured();
}

export async function PATCH(): Promise<NextResponse> {
  return notConfigured();
}

export async function DELETE(): Promise<NextResponse> {
  return notConfigured();
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_PROVIDERS = ["claude", "grok", "gpt4o"] as const;

export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = params.provider;
  if (!ALLOWED_PROVIDERS.includes(provider as typeof ALLOWED_PROVIDERS[number])) {
    return NextResponse.json(
      { error: `Invalid provider: ${provider}. Use: ${ALLOWED_PROVIDERS.join(", ")}` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { messages, context } = body;

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  // Route to appropriate Supabase Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-consensus-engine`;

  const response = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      provider,
      messages,
      context,
      user_id: user.id,
    }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

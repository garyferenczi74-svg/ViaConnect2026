import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const kitId = formData.get("kitId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  if (!kitId) {
    return NextResponse.json({ error: "kitId required" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const fileName = `${user.id}/${kitId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("genex-uploads")
    .upload(fileName, file);

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Trigger processing via Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const processResponse = await fetch(
    `${supabaseUrl}/functions/v1/process-genex-upload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        user_id: user.id,
        kit_id: kitId,
        file_path: fileName,
      }),
    }
  );

  const result = await processResponse.json();
  return NextResponse.json(result, { status: processResponse.status });
}

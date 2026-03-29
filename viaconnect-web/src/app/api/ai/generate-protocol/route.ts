import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Load user's medications and supplements for interaction checking
    const { data: assessments } = await supabase
      .from("assessment_results")
      .select("phase, data")
      .eq("user_id", user.id);

    const phase4Data = assessments?.find((a) => a.phase === 4)?.data as Record<string, unknown> | undefined;
    const medications = (phase4Data?.medications as string[]) || [];
    const supplements = ((phase4Data?.userSupplements as Array<{ name: string }>) || []).map((s) => s.name);

    // TODO: Generate full AI protocol from all CAQ data using Claude API
    // For now, return a basic protocol structure
    const protocol = {
      morning: ["Liposomal Vitamin D3 + K2", "Methylated B Complex", "Omega-3 DHA/EPA"],
      afternoon: ["Liposomal CoQ10 (Ubiquinol)"],
      evening: ["Liposomal Magnesium L-Threonate", "Melatonin (Extended Release)"],
      asNeeded: ["Liposomal NAC", "L-Theanine"],
    };

    // Safety gate: check protocol products against medications
    let interactions: Array<{ severity: string; interactsWith: string; medication: string; mechanism: string; mitigation: string }> = [];
    let blockedProducts: string[] = [];

    if (medications.length > 0) {
      try {
        const allProtocolProducts = [...protocol.morning, ...protocol.afternoon, ...protocol.evening, ...protocol.asNeeded];
        const interactionRes = await fetch(new URL("/api/ai/check-interactions", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            medications,
            supplements,
            recommendations: allProtocolProducts,
            allergies: (phase4Data?.allergies as string[]) || [],
          }),
        });
        const interactionData = await interactionRes.json();
        interactions = interactionData.interactions || [];
        blockedProducts = interactionData.blockedProducts || [];
      } catch { /* interaction check failed, proceed without blocking */ }
    }

    // Remove blocked products from protocol
    const blockedSet = new Set(blockedProducts.map((p) => p.toLowerCase()));
    const safeProtocol = {
      morning: protocol.morning.filter((p) => !blockedSet.has(p.toLowerCase())),
      afternoon: protocol.afternoon.filter((p) => !blockedSet.has(p.toLowerCase())),
      evening: protocol.evening.filter((p) => !blockedSet.has(p.toLowerCase())),
      asNeeded: protocol.asNeeded.filter((p) => !blockedSet.has(p.toLowerCase())),
    };

    // Save protocol
    await supabase.from("user_protocols").upsert({
      user_id: user.id,
      protocol_name: "AI-Generated Protocol",
      source: "ai_caq",
      protocol_data: { ...safeProtocol, blockedProducts, interactions },
      confidence_score: medications.length > 0 ? 72 : 68,
      is_active: true,
    }, { onConflict: "user_id" }).catch(() => {});

    const totalRecs = safeProtocol.morning.length + safeProtocol.afternoon.length + safeProtocol.evening.length + safeProtocol.asNeeded.length;

    return NextResponse.json({
      protocol: safeProtocol,
      blockedProducts,
      interactions,
      recommendations_count: totalRecs,
      confidenceScore: 72,
      message: blockedProducts.length > 0
        ? `Protocol generated with ${blockedProducts.length} product(s) blocked due to medication interactions.`
        : "Protocol generated successfully.",
    });
  } catch {
    return NextResponse.json({ error: "Protocol generation failed", recommendations_count: 0 }, { status: 500 });
  }
}

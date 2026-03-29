// Safety gate: checks AI protocol against medications before saving
// Called after protocol generation, before displaying to user

export async function checkProtocolSafety(
  userId: string,
  medications: string[],
  supplements: string[],
  protocolProducts: string[],
  allergies: string[]
) {
  try {
    const res = await fetch("/api/ai/check-interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        medications,
        supplements,
        recommendations: protocolProducts,
        allergies,
      }),
    });
    return await res.json();
  } catch {
    return { interactions: [], summary: { major: 0, moderate: 0, minor: 0, synergistic: 0 }, blockedProducts: [] };
  }
}

export function filterBlockedFromProtocol(
  protocol: { morning: string[]; afternoon: string[]; evening: string[]; asNeeded: string[] },
  blockedProducts: string[]
) {
  const blocked = new Set(blockedProducts.map((p) => p.toLowerCase()));
  return {
    morning: protocol.morning.filter((p) => !blocked.has(p.toLowerCase())),
    afternoon: protocol.afternoon.filter((p) => !blocked.has(p.toLowerCase())),
    evening: protocol.evening.filter((p) => !blocked.has(p.toLowerCase())),
    asNeeded: protocol.asNeeded.filter((p) => !blocked.has(p.toLowerCase())),
  };
}

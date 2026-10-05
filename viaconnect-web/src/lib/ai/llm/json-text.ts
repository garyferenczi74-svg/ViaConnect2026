/** True when the text contains a JSON object, including a fenced block. */

export function containsJsonObject(raw: string): boolean {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return false;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

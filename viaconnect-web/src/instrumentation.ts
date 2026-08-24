/**
 * Next.js instrumentation: normalize env aliases at process start.
 * Vercel env names are case-sensitive; operators sometimes set anthropic_api_key
 * while code reads ANTHROPIC_API_KEY. Same pattern as firecrawl_api_key.
 */
export async function register(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    const alt =
      process.env.anthropic_api_key?.trim() ||
      process.env.Anthropic_API_Key?.trim() ||
      process.env.PHOTO_AI_ANTHROPIC_API_KEY?.trim() ||
      "";
    if (alt) {
      process.env.ANTHROPIC_API_KEY = alt;
    }
  }
  if (!process.env.FIRECRAWL_API_KEY?.trim()) {
    const fc = process.env.firecrawl_api_key?.trim() || "";
    if (fc) {
      process.env.FIRECRAWL_API_KEY = fc;
    }
  }
  if (!process.env.XAI_API_KEY?.trim()) {
    const x =
      process.env.GROK_API_KEY?.trim() || process.env.xai_api_key?.trim() || "";
    if (x) {
      process.env.XAI_API_KEY = x;
    }
  }
}

import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ANTHROPIC_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AnthropicMime = typeof ANTHROPIC_ALLOWED_MIME[number];
const HEIC_MIME = ['image/heic', 'image/heif'];
const MAX_BYTES_AFTER_NORMALIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType } = await request.json();
    if (!imageBase64) return NextResponse.json({ success: false, error: 'No image' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY not set in .env.local' }, { status: 500 });

    let normalizedBase64: string = imageBase64;
    let normalizedMime: string = (typeof mimeType === 'string' ? mimeType : 'image/jpeg').toLowerCase();

    if (HEIC_MIME.includes(normalizedMime)) {
      try {
        const inputBuffer = Buffer.from(imageBase64, 'base64');
        let outputBuffer = await sharp(inputBuffer).jpeg({ quality: 85 }).toBuffer();
        if (outputBuffer.byteLength > MAX_BYTES_AFTER_NORMALIZE) {
          outputBuffer = await sharp(inputBuffer)
            .resize({ width: 1800, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        }
        normalizedBase64 = outputBuffer.toString('base64');
        normalizedMime = 'image/jpeg';
      } catch {
        return NextResponse.json(
          { success: false, error: 'Could not convert HEIC photo. Try retaking in JPG mode via iPhone Settings, or upload a different photo.' },
          { status: 400 },
        );
      }
    }

    if (!ANTHROPIC_ALLOWED_MIME.includes(normalizedMime as AnthropicMime)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported image format. Use JPEG, PNG, WebP, or HEIC.' },
        { status: 400 },
      );
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: normalizedMime, data: normalizedBase64 } },
          { type: 'text', text: 'You are a supplement product identification engine. Look at this supplement product photo and extract ALL information. Return ONLY valid JSON (no markdown, no backticks): {"brand":"string","productName":"string","servingSize":"string","totalCount":0,"ingredients":[{"name":"string","form":"string or null","amount":0,"unit":"mg","isPartOfBlend":false}],"overallConfidence":"high or medium or low"}' }
        ]}]
      }),
    });

    if (!res.ok) { const e = await res.text(); return NextResponse.json({ success: false, error: 'API ' + res.status + ': ' + e.substring(0,200) }, { status: 500 }); }

    const data = await res.json();
    const text = data.content?.find((b: { type: string; text?: string }) => b.type === 'text')?.text || '';
    const clean = text.replace(/```json?\s*/gi,'').replace(/```/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ success: false, error: 'No JSON in response' }, { status: 500 });

    return NextResponse.json({ success: true, data: JSON.parse(m[0]) });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

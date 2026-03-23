/**
 * ViaConnect GeneX360 — Research Stream API Route
 *
 * Edge-compatible route handler that orchestrates multi-source research queries.
 * Streams Claude responses and batches results from PubMed, ClinicalTrials,
 * Grok, Perplexity, and FarmCeutica KB.
 *
 * POST /api/research/stream
 * Body: { query, source?, sources[], filters{}, includeGenetics, geneticProfile, systemPrompt }
 */

// Environment variables (server-side only)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const XAI_API_KEY = process.env.XAI_API_KEY ?? '';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY ?? '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const NCBI_API_KEY = process.env.NCBI_API_KEY ?? '';

interface RequestBody {
  query: string;
  source?: 'claude' | 'grok' | 'web' | 'pubmed';
  systemPrompt?: string;
  includeGenetics?: boolean;
  geneticProfile?: Record<string, unknown> | null;
  filters?: Record<string, unknown>;
}

// ── Claude Streaming Handler ───────────────────────────────────────────────

async function streamClaude(
  query: string,
  systemPrompt: string,
  geneticProfile?: Record<string, unknown> | null,
): Promise<ReadableStream> {
  const messages = [{ role: 'user' as const, content: query }];

  let system = systemPrompt;
  if (geneticProfile) {
    system += `\n\nUser Genetic Profile:\n${JSON.stringify(geneticProfile, null, 2)}`;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              controller.enqueue(
                new TextEncoder().encode(parsed.delta.text),
              );
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    },
  });
}

// ── Grok Handler ───────────────────────────────────────────────────────────

async function queryGrok(
  query: string,
  geneticProfile?: Record<string, unknown> | null,
): Promise<{ content: string; citations: unknown[] }> {
  let systemContent =
    'You are a real-time health research analyst. Provide data-driven analysis with latest research findings. Be concise and cite sources.';
  if (geneticProfile) {
    systemContent += `\n\nUser Genetic Profile:\n${JSON.stringify(geneticProfile, null, 2)}`;
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: query },
      ],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  return { content, citations: [] };
}

// ── Perplexity Web Search Handler ──────────────────────────────────────────

async function queryPerplexity(
  query: string,
): Promise<{ content: string; citations: Array<{ type: string; id: string; title: string; url: string }> }> {
  const response = await fetch(
    'https://api.perplexity.ai/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content:
              'Search for credible health and medical research from .gov, .edu, pubmed, cochrane, and who.int domains. Provide evidence-based answers with inline citations.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 2048,
        search_domain_filter: [
          'pubmed.ncbi.nlm.nih.gov',
          'nih.gov',
          'who.int',
          'cochranelibrary.com',
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const citations = (data.citations ?? []).map(
    (url: string, i: number) => ({
      type: 'web',
      id: `web-${i + 1}`,
      title: url.split('/').pop() ?? url,
      url,
    }),
  );

  return { content, citations };
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const body: RequestBody = await request.json();
    const { query, source, systemPrompt, includeGenetics, geneticProfile } =
      body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Route to specific source handler
    switch (source) {
      case 'claude': {
        const defaultPrompt =
          systemPrompt ??
          'You are a precision health research assistant. Provide evidence-based answers with inline citations [1], [2], etc.';
        const stream = await streamClaude(
          query,
          defaultPrompt,
          includeGenetics ? geneticProfile : null,
        );
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      case 'grok': {
        const result = await queryGrok(
          query,
          includeGenetics ? geneticProfile : null,
        );
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'web': {
        const result = await queryPerplexity(query);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'pubmed': {
        // Return the NCBI API key to the client-side research engine
        // so PubMed E-utilities calls include it for higher rate limits
        return new Response(
          JSON.stringify({ ncbiApiKey: NCBI_API_KEY || null }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }

      default: {
        return new Response(
          JSON.stringify({
            error: `Unknown source: ${source}. Use 'claude', 'grok', 'web', or 'pubmed'.`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }
  } catch (err) {
    console.error('Research stream error:', err);
    return new Response(
      JSON.stringify({
        error: (err as Error).message ?? 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

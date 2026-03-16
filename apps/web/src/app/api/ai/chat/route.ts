import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  patientId?: string;
  conversationId?: string;
}

interface Citation {
  source: string;
  title: string;
  pmid?: string;
  url?: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_PATIENTS: Record<string, {
  name: string;
  caqSummary: string;
  genomicProfile: string;
  currentRegimen: string;
}> = {
  'patient-1': {
    name: 'Maria Santos',
    caqSummary:
      'Age 42, female. Reports chronic fatigue, brain fog, elevated homocysteine (14.2 umol/L). ' +
      'History of anxiety, mild depression. Sleep quality rated 4/10. Diet: Mediterranean-style, ' +
      'moderate caffeine (2 cups/day). Exercise: yoga 3x/week. No current pharmaceuticals. ' +
      'Family history: cardiovascular disease (father), Alzheimer\'s (maternal grandmother).',
    genomicProfile:
      'MTHFR C677T heterozygous (rs1801133 CT) — reduced methylation capacity ~35%. ' +
      'COMT V158M homozygous slow (rs4680 AA) — impaired catecholamine clearance. ' +
      'VDR Taq (rs731236 CT) — moderate vitamin D receptor efficiency. ' +
      'APOE 3/4 — elevated cardiovascular and neurodegenerative risk. ' +
      'SOD2 A16V (rs4880 CT) — reduced mitochondrial antioxidant capacity.',
    currentRegimen:
      'Multivitamin (generic, contains folic acid — flagged for MTHFR incompatibility). ' +
      'Fish oil 1000 mg/day. Vitamin D3 2000 IU/day.',
  },
};

function buildPatientContext(patientId: string): string {
  const patient = MOCK_PATIENTS[patientId];
  if (!patient) return '';
  return [
    `## Patient: ${patient.name}`,
    '',
    '### Clinical Assessment Questionnaire (CAQ)',
    patient.caqSummary,
    '',
    '### Genomic Profile',
    patient.genomicProfile,
    '',
    '### Current Regimen',
    patient.currentRegimen,
  ].join('\n');
}

function buildRagContext(messages: ChatRequest['messages']): string {
  const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() ?? '';

  const chunks: string[] = [];

  if (lastMessage.includes('methyl') || lastMessage.includes('mthfr') || lastMessage.includes('b12') || lastMessage.includes('folate')) {
    chunks.push(
      '[RAG-1] Methylfolate supplementation in MTHFR C677T carriers significantly reduces homocysteine ' +
      'levels compared to folic acid (Tsang et al., 2020, PMID: 32456789). Recommended dose: 400-800 mcg/day ' +
      'L-5-MTHF for heterozygous carriers.',
    );
    chunks.push(
      '[RAG-2] COMT slow metabolizers benefit from lower-dose methylation support to avoid methyl-donor ' +
      'excess, which can exacerbate anxiety (Stahl, 2018, PMID: 29876543). Titration starting at 400 mcg ' +
      'is advisable.',
    );
  }

  if (lastMessage.includes('supplement') || lastMessage.includes('recommend') || lastMessage.includes('stack')) {
    chunks.push(
      '[RAG-3] Magnesium glycinate at 200-400 mg/day supports COMT function and has demonstrated ' +
      'anxiolytic effects in randomized trials (Boyle et al., 2017, PMID: 28445426).',
    );
    chunks.push(
      '[RAG-4] Vitamin D3 supplementation at 4000-5000 IU/day is recommended for VDR polymorphism ' +
      'carriers with suboptimal serum levels (Holick et al., 2011, PMID: 21646368).',
    );
  }

  if (chunks.length === 0) {
    chunks.push(
      '[RAG-1] Nutrigenomic-guided supplementation has shown improved clinical outcomes compared to ' +
      'generic protocols in multiple RCTs (Ordovas & Ferguson, 2022, PMID: 35012345).',
    );
  }

  return '### Retrieved Evidence\n' + chunks.join('\n\n');
}

function buildSystemPrompt(patientContext: string, ragContext: string): string {
  return [
    'You are a clinical AI assistant for ViaConnect GeneX360, a nutrigenomic decision-support platform.',
    'You provide evidence-based supplement and lifestyle recommendations grounded in the patient\'s',
    'genetic profile, clinical assessment, and peer-reviewed literature.',
    '',
    'Guidelines:',
    '- Always reference specific genetic variants (rs numbers) when explaining rationale.',
    '- Include inline citations using bracket notation [1], [2], etc.',
    '- Flag any safety concerns, drug-nutrient interactions, or contraindications.',
    '- Recommend titration schedules when appropriate for sensitive genotypes.',
    '- Never diagnose or replace physician guidance — frame as decision-support.',
    '',
    patientContext,
    '',
    ragContext,
  ].join('\n');
}

const MOCK_STREAMING_RESPONSE = {
  content:
    'Based on Maria\'s genomic profile, I recommend the following adjustments to her current regimen:\n\n' +
    '**1. Replace folic acid with L-5-Methyltetrahydrofolate (L-5-MTHF)**\n' +
    'Maria\'s MTHFR C677T heterozygous status (rs1801133 CT) reduces her ability to convert folic acid ' +
    'to its active form by approximately 35%. Her current generic multivitamin containing folic acid should ' +
    'be replaced with a methylated B-complex providing 400-800 mcg of L-5-MTHF [1]. Given her COMT slow ' +
    'metabolizer status (rs4680 AA), I recommend starting at the lower end (400 mcg) and titrating up over ' +
    '4 weeks to avoid methyl-donor excess, which can exacerbate anxiety [2].\n\n' +
    '**2. Add Magnesium Glycinate 300 mg/day**\n' +
    'Magnesium glycinate supports COMT enzyme function and has demonstrated anxiolytic properties in ' +
    'randomized controlled trials [3]. This form has superior bioavailability and is well-tolerated. ' +
    'Take in the evening to also support sleep quality (currently rated 4/10).\n\n' +
    '**3. Increase Vitamin D3 to 5000 IU/day**\n' +
    'Maria\'s VDR Taq polymorphism (rs731236 CT) suggests moderate receptor efficiency, warranting ' +
    'higher-dose supplementation. Current dose of 2000 IU/day is likely insufficient given her genotype [4]. ' +
    'Recheck 25(OH)D levels after 8 weeks.\n\n' +
    '**Safety Note:** Given Maria\'s APOE 3/4 status, cardiovascular biomarkers should be monitored ' +
    'quarterly. Her SOD2 variant (rs4880 CT) suggests she may benefit from CoQ10 supplementation (200 mg/day) ' +
    'for mitochondrial antioxidant support. No drug-nutrient interactions identified with her current profile.',
  citations: [
    { source: 'PubMed', title: 'Methylfolate vs folic acid in MTHFR carriers', pmid: '32456789', url: 'https://pubmed.ncbi.nlm.nih.gov/32456789' },
    { source: 'PubMed', title: 'Methyl-donor sensitivity in slow COMT metabolizers', pmid: '29876543', url: 'https://pubmed.ncbi.nlm.nih.gov/29876543' },
    { source: 'PubMed', title: 'Magnesium and anxiety: a systematic review', pmid: '28445426', url: 'https://pubmed.ncbi.nlm.nih.gov/28445426' },
    { source: 'PubMed', title: 'Vitamin D supplementation in VDR polymorphism carriers', pmid: '21646368', url: 'https://pubmed.ncbi.nlm.nih.gov/21646368' },
  ] as Citation[],
};

// ---------------------------------------------------------------------------
// POST — Streaming chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json(
        { error: 'messages array is required and must not be empty' },
        { status: 400 },
      );
    }

    for (const msg of body.messages) {
      if (!['user', 'assistant'].includes(msg.role) || typeof msg.content !== 'string') {
        return Response.json(
          { error: 'Each message must have a valid role ("user"|"assistant") and string content' },
          { status: 400 },
        );
      }
    }

    const patientId = body.patientId ?? 'patient-1';
    const conversationId = body.conversationId ?? `conv-${Date.now()}`;

    const patientContext = buildPatientContext(patientId);
    const ragContext = buildRagContext(body.messages);
    // System prompt would be sent to Claude in production
    const _systemPrompt = buildSystemPrompt(patientContext, ragContext);

    const fullText = MOCK_STREAMING_RESPONSE.content;
    const citations = MOCK_STREAMING_RESPONSE.citations;
    const messageId = `msg-${Date.now()}`;

    // Simulate streaming by splitting the response into word-level chunks
    const words = fullText.split(/(\s+)/);
    const chunkSize = 3;
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(''));
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Initial metadata event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ conversationId, messageId, role: 'assistant' })}\n\n`,
          ),
        );

        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`),
          );
          // Small delay to simulate token generation
          await new Promise((resolve) => setTimeout(resolve, 15));
        }

        // Final event with citations and completion signal
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, citations, messageId, conversationId })}\n\n`,
          ),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': conversationId,
        'X-Message-Id': messageId,
      },
    });
  } catch (error) {
    console.error('[ai/chat] POST error:', error);
    return Response.json(
      { error: 'Internal server error processing chat request' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Chat history
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return Response.json(
        { error: 'conversationId query parameter is required' },
        { status: 400 },
      );
    }

    const now = new Date();
    const messages: ChatMessage[] = [
      {
        id: 'msg-hist-001',
        conversationId,
        role: 'system',
        content: 'Clinical AI assistant session started for patient Maria Santos.',
        createdAt: new Date(now.getTime() - 300_000).toISOString(),
      },
      {
        id: 'msg-hist-002',
        conversationId,
        role: 'user',
        content: 'What supplements should Maria consider given her MTHFR and COMT variants?',
        createdAt: new Date(now.getTime() - 240_000).toISOString(),
      },
      {
        id: 'msg-hist-003',
        conversationId,
        role: 'assistant',
        content: MOCK_STREAMING_RESPONSE.content,
        citations: MOCK_STREAMING_RESPONSE.citations,
        createdAt: new Date(now.getTime() - 200_000).toISOString(),
      },
      {
        id: 'msg-hist-004',
        conversationId,
        role: 'user',
        content: 'Should she be concerned about methyl trapping with her COMT status?',
        createdAt: new Date(now.getTime() - 120_000).toISOString(),
      },
      {
        id: 'msg-hist-005',
        conversationId,
        role: 'assistant',
        content:
          'Excellent question. With Maria\'s COMT V158M homozygous slow status (rs4680 AA), methyl-donor ' +
          'excess is a genuine concern. Slow COMT metabolizers clear catecholamines (dopamine, norepinephrine) ' +
          'more slowly, and excessive methylation support can amplify this, potentially increasing anxiety and ' +
          'irritability [1]. This is why I recommended starting L-5-MTHF at 400 mcg rather than the typical ' +
          '800 mcg dose [2]. Monitor symptoms weekly during titration.',
        citations: [
          { source: 'PubMed', title: 'COMT polymorphisms and methylation tolerance', pmid: '31234567', url: 'https://pubmed.ncbi.nlm.nih.gov/31234567' },
          { source: 'PubMed', title: 'Titration protocols for MTHFR/COMT compound genotypes', pmid: '30987654', url: 'https://pubmed.ncbi.nlm.nih.gov/30987654' },
        ],
        createdAt: new Date(now.getTime() - 60_000).toISOString(),
      },
    ];

    return Response.json({
      conversationId,
      messages,
      patientId: 'patient-1',
      messageCount: messages.length,
    });
  } catch (error) {
    console.error('[ai/chat] GET error:', error);
    return Response.json(
      { error: 'Internal server error retrieving chat history' },
      { status: 500 },
    );
  }
}

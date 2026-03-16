export type AIProvider = 'claude' | 'openai' | 'gemini' | 'deepseek' | 'perplexity';

export type AIAnalysisRequest = {
  provider: AIProvider;
  prompt: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
};

export type AIAnalysisResponse = {
  provider: AIProvider;
  content: string;
  confidence: number;
  citations?: string[];
};

export async function analyzeWithAI(_request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  // Placeholder - will integrate with actual AI APIs
  return {
    provider: _request.provider,
    content: '',
    confidence: 0,
  };
}

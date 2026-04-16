export interface Source {
  type:
    | 'pubmed'
    | 'internal_protocol'
    | 'caq'
    | 'gene_panel'
    | 'supplement_db'
    | 'interaction_rule'
    | 'other';
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
}

export interface Citation extends Source {
  relevanceScore: number;
  rank: number;
}

/**
 * Rank retrieved sources by relevance to the final answer.
 * Simple BM25-style token overlap scoring. Upgrade to embedding rerank in #88b.
 */
export async function rankEvidence(args: {
  query: string;
  answer: string;
  sources: Source[];
}): Promise<Citation[]> {
  const answerTokens = tokenize(args.answer);
  const scored = args.sources.map((s) => {
    const snippetTokens = tokenize(s.snippet ?? '');
    const overlap = snippetTokens.filter((t) => answerTokens.includes(t)).length;
    const score = snippetTokens.length > 0 ? overlap / snippetTokens.length : 0;
    return { ...s, relevanceScore: Math.round(score * 100) / 100 };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored.slice(0, 5).map((s, i) => ({ ...s, rank: i + 1 }));
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
}

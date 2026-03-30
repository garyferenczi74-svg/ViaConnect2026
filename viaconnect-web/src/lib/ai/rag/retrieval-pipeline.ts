// RAG Retrieval Pipeline — Hybrid search, reranking, query building
// Uses Supabase pgvector for similarity search

import { createClient } from "@/lib/supabase/client";
import type { PatientContext } from "../ultrathink-engine";

export interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  author?: string;
  evidenceLevel?: string;
  specialty?: string;
  relevanceScore: number;
}

function getTopSymptomNames(context: PatientContext, count: number): string[] {
  const all = [
    ...Object.entries(context.symptomsPhysical || {}).map(([k, v]) => ({ name: k, score: v?.score || 0 })),
    ...Object.entries(context.symptomsNeurological || {}).map(([k, v]) => ({ name: k, score: v?.score || 0 })),
    ...Object.entries(context.symptomsEmotional || {}).map(([k, v]) => ({ name: k, score: v?.score || 0 })),
  ].sort((a, b) => b.score - a.score);
  return all.slice(0, count).map(s => s.name.replace(/_severity$/, "").replace(/_/g, " "));
}

function buildRetrievalQueries(context: PatientContext): Array<{ text: string; specialty: string | null; topK: number }> {
  const queries: Array<{ text: string; specialty: string | null; topK: number }> = [];
  const top = getTopSymptomNames(context, 5);

  // Core symptom pattern query
  queries.push({ text: top.join(" + ") + " root cause pattern", specialty: null, topK: 10 });

  // Medication depletion query
  if (context.medications?.length) {
    queries.push({ text: context.medications.map(m => m.name).join(", ") + " nutrient depletion", specialty: "vitamins_minerals", topK: 5 });
  }

  // TCM pattern query
  queries.push({ text: top.join(" ") + " TCM pattern differentiation", specialty: "tcm", topK: 5 });

  // Ayurvedic dosha query
  queries.push({ text: top.join(" ") + " dosha imbalance Ayurveda", specialty: "ayurvedic", topK: 3 });

  // FarmCeutica product matching
  queries.push({ text: top.join(" ") + " supplement protocol nutraceutical", specialty: "farmceutica", topK: 8 });

  // Genetic associations (if data exists)
  if (context.geneticData) {
    const variants = Object.keys(context.geneticData);
    if (variants.length) queries.push({ text: variants.join(" ") + " nutrigenomics pharmacogenomics", specialty: "nutritional_genomics", topK: 8 });
  }

  return queries;
}

export async function retrieveRelevantKnowledge(context: PatientContext): Promise<RetrievedChunk[]> {
  const supabase = createClient();
  const queries = buildRetrievalQueries(context);

  // For now, return empty chunks until RAG is seeded
  // When pgvector embeddings are populated, this will do real similarity search
  const chunks: RetrievedChunk[] = [];

  try {
    // Check if knowledge_chunks table has data
    const { count } = await supabase.from("knowledge_chunks").select("*", { count: "exact", head: true });

    if (count && count > 0) {
      // Real RAG retrieval would happen here using match_knowledge_chunks RPC
      // For each query, call the similarity search function
      for (const query of queries) {
        // TODO: Generate embedding for query.text using embedding API
        // const embedding = await generateEmbedding(query.text);
        // const { data } = await supabase.rpc("match_knowledge_chunks", {
        //   query_embedding: embedding,
        //   match_threshold: 0.72,
        //   match_count: query.topK,
        //   filter_specialty: query.specialty,
        // });
        // if (data) chunks.push(...data.map(formatChunk));
        void query; // Suppress unused variable warning
      }
    }
  } catch {
    // RAG not yet set up — engine works without it
  }

  return chunks;
}

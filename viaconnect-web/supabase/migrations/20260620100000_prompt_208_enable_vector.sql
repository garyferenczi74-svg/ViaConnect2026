-- Prompt 208 v2: enable pgvector for the knowledge corpus.
-- Powers knowledge_atoms.embedding (atom dedup) and knowledge_queries.embedding
-- (high-frequency gap clustering). Append-only and idempotent.
CREATE EXTENSION IF NOT EXISTS vector;

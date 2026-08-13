-- Placeholder Sprint 0: refuerzo explícito de pgvector para embeddings/RAG (Sprint 2+).
-- La extensión ya se crea en 001; este archivo documenta la intención de capa vectorial.

CREATE EXTENSION IF NOT EXISTS vector;

COMMENT ON EXTENSION vector IS 'pgvector para embeddings RAG en AgroSmart Insights';

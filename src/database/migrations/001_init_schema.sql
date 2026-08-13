-- AgroSmart Insights - Schema base (Sprint 0)
-- Owner de firma: Arquitecto de Software

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS schema_meta (
    id          SERIAL PRIMARY KEY,
    version     TEXT NOT NULL UNIQUE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_meta (version)
VALUES ('001_init_schema')
ON CONFLICT (version) DO NOTHING;

-- Tablas de negocio Open Data (precios, volúmenes, etc.) se agregan en migraciones siguientes (Sprint 1+).

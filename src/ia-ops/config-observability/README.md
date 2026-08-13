# Config Observabilidad (IA Ops)

**Owner:** Líder DevSecOps (inyección de variables) + Backend (instrumentación en n8n)  
**Sprint 0:** plantilla de variables. Conexión real a Langfuse/Phoenix = Sprint 3.

## Variables (ver `infrastructure/.env.example`)
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_HOST`

## Objetivo
Auditar latencia, costo de tokens y respuestas LLM. Ninguna consulta NLQ debe ejecutarse a ciegas.

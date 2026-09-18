# Base de datos — PostgreSQL + pgvector

## Migraciones (`migrations/`)

| Archivo | Contenido |
|---|---|
| `001_schema.sql` | Tablas `precios_diarios`, `clima_diario`, `documentos_rag` + extensión vector |
| `002_indexes.sql` | Índices B-Tree para consultas frecuentes |

Montadas automáticamente en Docker init (`infrastructure/docker-compose.yml`).

## Seeders (`seeders/`)

Datos demo GMML — ver `seeders/README.md` (carga manual).

## Stack

- Imagen: `pgvector/pgvector:pg16`
- Consumido por: WF0 (RAG), WF1 (ingesta), WF2 (chat/predicción)

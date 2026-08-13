# Database (PostgreSQL + pgvector)

**Owner:** Arquitecto (firma de esquema) + Backend (uso en n8n)  
**Sprint 0:** migración base para levantar el entorno local.

## Estructura
```
src/database/
├── migrations/   # DDL versionado (se monta en docker-compose)
├── seeders/      # Datos de prueba / Open Data local
└── README.md
```

## Arranque local
`infrastructure/docker-compose.yml` monta `migrations/` en `/docker-entrypoint-initdb.d` del contenedor Postgres.

## Reglas
- Toda tabla nueva = nueva migración numerada.
- Sin credenciales en SQL.
- Extensión `vector` (pgvector) habilitada desde `001_init_schema.sql`.

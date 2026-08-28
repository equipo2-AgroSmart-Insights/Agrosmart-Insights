# Seeders

Datos de demostración exportados desde PostgreSQL (GMML + clima).

| Archivo | Descripción |
|---|---|
| `002_seed_v2.sql` | ~9k filas de `precios_diarios` + `clima_diario` |

## Carga manual (recomendado)

No se ejecuta automáticamente en Docker init (archivo grande). Tras levantar Postgres:

```bash
docker exec -i agrosmart_db psql -U postgres -d agrosmart_db < src/database/seeders/002_seed_v2.sql
```

O con `psql` remoto (Render):

```bash
psql "$DATABASE_URL" -f src/database/seeders/002_seed_v2.sql
```

# Migrations

## Run Migration

```bash
# 1. Start PostgreSQL container
docker-compose -f docker-compose.production.yml up -d postgres

# 2. Wait for postgres to be ready (check logs)
docker logs crea_postgres

# 3. Run the initial schema
docker exec -i crea_postgres psql -U crea -d crea_db < migrations/001_initial_schema.sql

# 4. Verify tables were created
docker exec -i crea_postgres psql -U crea -d crea_db -c "\dt"
```

## Structure

- `001_initial_schema.sql` - Complete schema with 22 tables, enums, triggers, indexes, and views

## Tables Created

- `categorias_editorial` - Editorial sections
- `patrocinadores` - Commercial sponsors
- `usuarios` - Team members and collaborators
- `ideas` - Editorial ideas capture
- `radar_briefings` - AI-generated context briefings
- `radar_alertas` - Monitoring alerts
- `piezas_contenido` - Content pieces (central table)
- `publicaciones` - Publication instances per channel
- `metricas_piezas` - Performance metrics per piece
- `metricas_semanales` - Weekly dashboard metrics
- `prospectos` - Commercial CRM pipeline
- `propuestas_comerciales` - Formal proposals
- `contratos_comerciales` - Closed contracts
- `misiones` - Gamification missions catalog
- `asignaciones_mision` - Mission assignments per user
- `logros` - Achievement badges catalog
- `logros_usuarios` - User achievements
- `puntos_uc` - UC (Unidades CREA) ledger
- `notificaciones` - System notifications
- `audit_log` - Immutable audit trail

## ENUMs Created

- `estado_idea`, `urgencia`, `formato_contenido`, `estado_pieza`
- `canal`, `estado_publicacion`, `rol_usuario`, `nivel_colaborador`
- `estado_pipeline`, `tipo_producto_comercial`, `fuente_idea`, `accion_audit`

## Views

- `v_resumen_editorial_hoy` - Daily editorial summary
- `v_ranking_colaboradores` - UC leaderboard
- `v_pipeline_comercial` - Active commercial pipeline
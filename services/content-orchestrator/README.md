# content-orchestrator

## Objetivo
Generar borradores editoriales a partir del brief RADAR usando ruteo IA hibrido.

## Responsabilidades
- Enrutar tareas entre modelo local y cloud premium.
- Generar draft, titulo, bajada y metadata editorial.
- Etiquetar nivel de riesgo y necesidad de revision.
- Emitir content.draft.ready.v1.

## Eventos consumidos
- radar.brief.ready.v1

## Eventos emitidos
- content.draft.ready.v1

## Dependencias
- Servicio de ruteo IA
- Politicas editoriales
- Registro de costos por inferencia

## SLO inicial
- p95 radar.brief.ready -> content.draft.ready <= 4 minutos

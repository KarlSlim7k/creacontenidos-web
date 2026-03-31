# metrics-analytics

## Objetivo
Calcular y exponer metricas operativas, editoriales y de impacto por nota.

## Responsabilidades
- Agregar eventos de publicacion y consumo.
- Calcular KPIs: alcance, tiempo de ciclo, costo por nota.
- Generar snapshots para otros modulos.
- Emitir metrics.snapshot.ready.v1.

## Eventos consumidos
- publication.completed.v1
- engagement.updated.v1 (futuro)

## Eventos emitidos
- metrics.snapshot.ready.v1

## Dependencias
- Data warehouse/OLAP
- Sistema de dashboards

## SLO inicial
- Snapshot inicial disponible <= 5 minutos despues de publicar

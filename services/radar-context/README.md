# radar-context

## Objetivo
Enriquecer ideas con contexto verificable (fuentes, antecedentes, riesgo y prioridad editorial).

## Responsabilidades
- Buscar contexto local/regional.
- Generar brief estructurado para redaccion.
- Calcular score de confianza y urgencia.
- Emitir radar.brief.ready.v1.

## Eventos consumidos
- idea.received.v1

## Eventos emitidos
- radar.brief.ready.v1

## Dependencias
- Index de busqueda
- Base de conocimiento local
- Modelos IA locales para analisis inicial

## SLO inicial
- p95 idea.received -> radar.brief.ready <= 4 minutos

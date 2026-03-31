# commercial-intel

## Objetivo
Detectar oportunidades comerciales (patrocinio y branded content) sin afectar integridad editorial.

## Responsabilidades
- Analizar rendimiento por tema/audiencia.
- Generar leads comerciales priorizados.
- Entregar recomendaciones accionables al equipo comercial.
- Emitir commercial.lead.detected.v1.

## Eventos consumidos
- metrics.snapshot.ready.v1
- publication.completed.v1

## Eventos emitidos
- commercial.lead.detected.v1

## Dependencias
- CRM comercial
- Politicas de separacion editorial-comercial

## SLO inicial
- Lead preliminar disponible <= 15 minutos tras snapshot relevante

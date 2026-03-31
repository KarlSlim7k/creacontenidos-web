# publication-hub

## Objetivo
Publicar contenido aprobado en web/canales y asegurar consistencia de estado.

## Responsabilidades
- Publicar nota aprobada en CMS/sitio.
- Versionar contenido publicado.
- Reintentar con idempotencia ante fallas.
- Emitir publication.completed.v1.

## Eventos consumidos
- editorial.approved.v1

## Eventos emitidos
- publication.completed.v1

## Dependencias
- CMS o storage de contenido
- CDN
- Broker de eventos

## SLO inicial
- p95 editorial.approved -> publication.completed <= 60 segundos

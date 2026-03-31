# editorial-control

## Objetivo
Aplicar gate editorial humano obligatorio y reglas de compliance antes de publicar.

## Responsabilidades
- Gestionar estados de revision editorial.
- Bloquear publicacion automatica sin aprobacion humana.
- Requerir doble validacion en notas sensibles.
- Emitir editorial.approved.v1 o editorial.rejected.v1.

## Eventos consumidos
- content.draft.ready.v1

## Eventos emitidos
- editorial.approved.v1
- editorial.rejected.v1

## Dependencias
- RBAC de usuarios editoriales
- Politicas legales/editoriales
- Bitacora de auditoria

## SLO inicial
- Tiempo de transicion de estado <= 1 segundo por accion de editor

# collaborator-gamification

## Objetivo
Gestionar reputacion y gamificacion de colaboradores con reglas transparentes y auditables.

## Responsabilidades
- Asignar puntos por contribucion validada.
- Gestionar niveles y recompensas.
- Detectar abuso y anomalias.
- Emitir collaborator.points.updated.v1.

## Eventos consumidos
- publication.completed.v1
- contribution.validated.v1 (futuro)

## Eventos emitidos
- collaborator.points.updated.v1

## Dependencias
- Base de identidad de colaboradores
- Politicas de moderacion

## SLO inicial
- Actualizacion de puntaje <= 1 minuto tras evento valido

# openclaw-runtime

## Objetivo
Orquestar ejecucion 24/7 de agentes y tareas entre modulos, con control de colas y fallback.

## Responsabilidades
- Coordinar jobs y dependencias del flujo.
- Priorizar colas por criticidad editorial.
- Supervisar salud de agentes IA y workers.
- Activar estrategias de recuperacion.

## Eventos consumidos
- Todos los eventos de orquestacion relevantes

## Eventos emitidos
- orchestration.job.failed.v1
- orchestration.job.recovered.v1

## Dependencias
- Scheduler/queue
- Observabilidad central
- Politicas de fallback

## SLO inicial
- Disponibilidad del orquestador >= 99.5%

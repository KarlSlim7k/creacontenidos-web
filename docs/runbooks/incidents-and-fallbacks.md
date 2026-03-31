# Runbook Operativo: Incidentes y Fallbacks

## 1. Caida de modelo cloud

Sintoma:
- Timeout o error 5xx en tareas premium.

Acciones:
1. Activar feature flag de fallback a modelo local para tareas no criticas.
2. Marcar notas premium como pending-editorial-upgrade.
3. Notificar a editorial que puede haber menor calidad de primer draft.

Exit condition:
- Se restablece cloud y se reprocesan drafts pendientes.

## 2. Cola de eventos creciendo sin consumo

Sintoma:
- Lag alto en broker o consumidores detenidos.

Acciones:
1. Revisar health y logs del consumidor por dominio.
2. Escalar replicas del consumidor afectado.
3. Habilitar consumo prioritario para eventos criticos (publicacion/aprobacion).

Exit condition:
- Lag vuelve al umbral normal definido.

## 3. Error en publicacion

Sintoma:
- editorial.approved.v1 emitido, pero sin publication.completed.v1.

Acciones:
1. Reintentar publicacion con idempotency key.
2. Si falla 3 veces, enviar a DLQ y abrir ticket de incidente.
3. Permitir publicacion manual de contingencia.

Exit condition:
- Nota publicada y estado reconciliado.

## 4. Riesgo legal detectado

Sintoma:
- Deteccion de entidad sensible o afirmacion no verificada.

Acciones:
1. Bloquear avance automatico a publicacion.
2. Requerir doble aprobacion (editor + legal/compliance).
3. Registrar decision y evidencia en auditoria.

Exit condition:
- Nota aprobada por doble gate o descartada.

## 5. Mac mini / OpenClaw offline

Sintoma:
- No se reciben jobs de orquestacion.

Acciones:
1. Activar runner secundario (si existe) o modo manual asistido.
2. Encolar solicitudes en buffer para replay.
3. Restaurar nodo principal y ejecutar replay ordenado.

Exit condition:
- Orquestador estable y cola drenada.

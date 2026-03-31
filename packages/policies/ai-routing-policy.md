# AI Routing Policy (v1)

## Objetivo
Optimizar costo, latencia y calidad en el uso de modelos IA.

## Ruteo por tipo de tarea
- Local model:
  - Clasificacion inicial
  - Resumen preliminar
  - Deteccion de duplicados
  - Extraccion de entidades basica
- Cloud premium:
  - Redaccion editorial final
  - Reescritura de alto impacto
  - Copy comercial critico

## Reglas de costo
1. Definir presupuesto diario y por modulo.
2. Emitir alerta al 80% del presupuesto.
3. Bloquear tareas no criticas al 100% y usar fallback local.

## Reglas de seguridad
- No enviar datos sensibles sin anonimizar.
- Registrar modelo usado por cada salida.
- Guardar trazabilidad para auditoria.

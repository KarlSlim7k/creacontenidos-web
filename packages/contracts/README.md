# contracts

Contratos compartidos para comunicacion entre servicios.

## Alcance
- Esquemas de eventos versionados.
- Convenciones de naming y versionado.
- Reglas de compatibilidad hacia atras.

## Convenciones
- Nombre: <dominio>.<accion>.v<version>
- Campo obligatorio: event_id, event_name, occurred_at, producer, payload
- No romper consumidores en cambios menores.

## Estructura
- events/: JSON Schema de eventos canonicos

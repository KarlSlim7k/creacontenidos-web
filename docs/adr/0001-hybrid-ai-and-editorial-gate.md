# ADR-0001: Arquitectura IA Hibrida con Gate Editorial

## Estado
Accepted

## Contexto
CREA requiere balancear costo, velocidad y calidad editorial en un flujo continuo 24/7, sin perder control humano en la publicacion de contenido.

## Decision
1. Adoptar estrategia IA hibrida (local + cloud premium).
2. Mantener gate editorial obligatorio antes de publicar.
3. Operar por eventos versionados para desacople de modulos.

## Consecuencias
Positivas:
- Control de costo por ruteo inteligente.
- Mejor resiliencia ante caidas de proveedores cloud.
- Trazabilidad completa de decisiones editoriales.

Negativas:
- Mayor complejidad operativa inicial.
- Necesidad de observabilidad y runbooks estrictos.

## Criterios de exito
- Publicacion confiable con supervision humana.
- Reduccion del costo medio por nota sin deterioro de calidad.
- Escalado modular por dominio sin regresiones severas.

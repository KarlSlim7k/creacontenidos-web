# ingest-gateway

## Objetivo
Recibir ideas desde canales externos (WhatsApp, Telegram, Web/API), normalizar payloads y emitir evento canonico.

## Responsabilidades
- Validar formato de entrada.
- Normalizar metadata (canal, autor, timestamp, idioma, adjuntos).
- Aplicar deduplicacion basica.
- Emitir evento idea.received.v1.

## Entrada
- Webhook WhatsApp/Telegram
- API HTTP interna

## Eventos emitidos
- idea.received.v1

## Dependencias
- Broker de eventos
- Almacen de adjuntos

## SLO inicial
- p95 de aceptacion de idea <= 2 segundos

# Docs

Documentacion tecnica del proyecto.

## Como navegar

| Si buscas... | Ir a |
|--------------|------|
| Arquitectura general | `architecture/operating-architecture.md` |
| Fases de implementacion globales | `architecture/implementation-phases.md` |
| Roadmap de desarrollo | `development-roadmap.md` |
| Decisiones de arquitectura (ADR) | `adr/0001-hybrid-ai-and-editorial-gate.md` |
| Incidentes y fallbacks | `runbooks/incidents-and-fallbacks.md` |
| Evaluacion de hosting | `hostinger-evaluation.md` |
| CMS (WordPress, headless) | `cms/` |
| Database (schemas, seeds) | `database/` |
| Asistente / IA agent config | `assistant/` |
| **Specs de features** (este es el que mas usa el agente IA) | `updates/` |

## Especificaciones de features (`updates/`)

Son el contrato "que construir". Cada spec tiene su skill operativa en `.opencode/skills/` que un agente IA debe cargar primero.

| Spec | Skill relacionada | Para que sirve |
|------|-------------------|----------------|
| `CREA_Brief_Desarrollador.md` | `fullstack` | Brief tecnico general del proyecto |
| `CREA_Canva_Flujo.md` | `fullstack` | Flujo de Canva en el sistema |
| `CREA_CRM_Pipedrive_HubSpot.md` | `crea-crm` | CRM interno: pipeline, actividades, tareas, scoring |
| `CREA_Newsletter_Podcast.md` | `fullstack` | Producto newsletter diario + podcast |
| `CREA_Pagina_Publica_Transformacion.md` | `crea-pagina-publica` + `crea-design-system` | Transformacion completa del sitio publico |
| `CREA_Social_Listening.md` | `fullstack` | Social listening Facebook + TikTok + Instagram |

### Orden sugerido para agentes IA

1. Cargar `.opencode/skills/fullstack/SKILL.md` (siempre).
2. Identificar el spec relevante arriba.
3. Cargar la skill especifica del spec.
4. Si la skill contradice el spec, gana el spec — avisar al usuario.

### Sincronizacion spec <-> skill

Cuando se modifique un spec en `updates/`, ejecutar:

```bash
bash scripts/sync-skills.sh
```

El script detecta drift (hash del spec vs ultima sincronizacion) y avisa si la skill quedo desactualizada. NO regenera skills automaticamente — solo alerta, porque las skills son resúmenes operativos editados a mano.

## Arquitectura y operacion

- architecture/operating-architecture.md
- architecture/implementation-phases.md

## Decisiones de arquitectura (ADR)

- adr/0001-hybrid-ai-and-editorial-gate.md

## Runbooks

- runbooks/incidents-and-fallbacks.md
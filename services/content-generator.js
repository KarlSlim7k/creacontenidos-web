#!/usr/bin/env node
/**
 * Content Generator Service - CREA Contenidos (Fase 5)
 *
 * - Genera propuestas IA en 6 formatos (nota, post, audio, video, meme, infografia)
 * - Modo dry-run si falta ANTHROPIC_API_KEY (guarda placeholders igualmente, para wiring)
 * - Persiste propuestas en PostgreSQL (tabla piezas_contenido) como "proposals"
 *
 * Uso:
 *   node services/content-generator.js
 *
 * Env opcional:
 *   CONTENT_GENERATOR_LIMIT=3
 *   CONTENT_GENERATOR_IDEA_ID=<uuid>
 *   RADAR_REGISTRADO_POR_EMAIL=editor@creacontenidos.com
 */

const fs = require('fs');
const path = require('path');

const { query, getSystemUserId } = require('./lib/db');
const { callClaude } = require('./lib/api-clients');

const SYSTEM_PROMPT_PATH = path.join(__dirname, '..', 'config', 'system-prompt-crea.md');
const AI_CONFIG_PATH = path.join(__dirname, '..', 'config', 'ai-config.json');

const LOG_PREFIX = '[ContentGenerator]';

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} [${timestamp}] [${type}] ${message}`);
}

function loadSystemPrompt() {
  try {
    return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
  } catch {
    return '';
  }
}

function loadAiConfig() {
  try {
    return JSON.parse(fs.readFileSync(AI_CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function normalizeTitle(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(title) {
  const base = normalizeTitle(title)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'propuesta';
}

async function ensureUniqueSlug(baseSlug, ignoreId = null) {
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const res = await query(
      `SELECT 1
       FROM piezas_contenido
       WHERE slug = $1 AND deleted_at IS NULL ${ignoreId ? 'AND id <> $2' : ''}
       LIMIT 1`,
      ignoreId ? [slug, ignoreId] : [slug]
    );
    if (res.rowCount === 0) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
}

function uiFormatToDbFormat(uiFormat) {
  const f = String(uiFormat || '').toLowerCase().trim();
  if (f === 'video') return 'guion_video';
  if (f === 'audio' || f === 'podcast') return 'capsula_audio';
  if (f === 'newsletter') return 'newsletter';
  if (f === 'post' || f === 'meme' || f === 'infografia') return 'carrusel_instagram';
  return 'nota_web';
}

function formatInstructions(format) {
  return {
    nota: 'Genera una nota informativa con título, subtítulo/bajada, cuerpo y sección de datos útiles.',
    post: 'Genera un post breve y directo para redes sociales (texto listo para publicar), con emoji moderado.',
    audio: 'Genera un guion conversacional para narrar en 60-90 segundos (incluye indicaciones de pausas).',
    video: 'Genera un guion de video con escenas, tiempo estimado, locución y sugerencias visuales.',
    meme: 'Genera un prompt ingenioso pero respetuoso para meme (sin ofensas), y texto superior/inferior si aplica.',
    infografia: 'Genera estructura para infografía con título, datos clave (bullets) y fuentes/referencias.',
  }[format] || 'Formato no reconocido.';
}

function buildUserPrompt(idea, format) {
  const ideaTitle = idea.titulo || 'Sin título';
  const ideaDesc = idea.descripcion || '';
  const ideaSource = idea.fuente || '';
  const ideaCreated = idea.created_at || '';

  return `Tema del radar:
- ID: ${idea.id}
- Título: ${ideaTitle}
- Descripción: ${ideaDesc}
- Fuente: ${ideaSource}
- Fecha detectada: ${ideaCreated}

Formato solicitado: ${format}
${formatInstructions(format)}

Contexto: Este contenido es para el medio digital CREA Contenidos (Perote, Veracruz). Audiencia general local.

Devuelve SOLO JSON (un objeto) con estas llaves:
{
  "title": "string",
  "body": "string",
  "image_prompt": "string|null",
  "ai_label": "humano|asistido|generado"
}
Sin texto adicional fuera del JSON.`;
}

async function generateProposal(idea, format, systemPrompt, aiCfg) {
  const model = aiCfg?.claude?.model || 'claude-sonnet-4-20250514';
  const maxTokens = aiCfg?.claude?.max_tokens || 1024;

  const user = buildUserPrompt(idea, format);
  const res = await callClaude({
    system: systemPrompt,
    user,
    model,
    maxTokens,
    temperature: 0.2,
    promptInfo: { topicTitle: idea.titulo, format },
  });

  const title = (res.title || '').trim() || `[PLACEHOLDER] Propuesta ${format} — ${idea.titulo || 'Sin título'}`;
  const body = (res.body || '').trim() || `Contenido placeholder para formato ${format}. Editar manualmente.`;
  const imagePrompt = res.image_prompt ? String(res.image_prompt).trim() : null;
  const aiLabel = (res.ai_label || 'generado').toString().trim().toLowerCase();

  return {
    format,
    title,
    body,
    image_prompt: imagePrompt || null,
    ai_label: ['humano', 'asistido', 'generado'].includes(aiLabel) ? aiLabel : 'generado',
    model: res.model || model,
    tokens_used: res.tokens_used ?? null,
    prompt_used: user,
  };
}

async function proposalExists(ideaId, uiFormat) {
  const res = await query(
    `SELECT 1
     FROM piezas_contenido
     WHERE deleted_at IS NULL
       AND idea_id = $1
       AND (metadata->>'is_proposal') = 'true'
       AND (metadata->>'service') = 'content_generator'
       AND (metadata->>'ui_format') = $2
     LIMIT 1`,
    [ideaId, uiFormat]
  );
  return res.rowCount > 0;
}

async function saveProposalToDb({ idea, proposal, autorId }) {
  const uiFormat = proposal.format;
  if (await proposalExists(idea.id, uiFormat)) {
    log(`Skip existing proposal: idea=${idea.id} format=${uiFormat}`, 'SKIP');
    return { skipped: true };
  }

  const slugBase = slugify(proposal.title);
  const slug = await ensureUniqueSlug(slugBase);
  const formatoDb = uiFormatToDbFormat(uiFormat);

  const meta = {
    is_proposal: true,
    service: 'content_generator',
    ui_format: uiFormat,
    ai_label: proposal.ai_label,
    status: 'draft',
    image_prompt: proposal.image_prompt,
    created_by: 'claude',
    source: 'anthropic',
    idea_id: idea.id,
  };

  const res = await query(
    `INSERT INTO piezas_contenido (
      idea_id,
      titulo,
      slug,
      categoria_id,
      formato,
      estado,
      autor_id,
      editor_id,
      contenido_markdown,
      borrador_ia,
      modelo_ia_usado,
      prompt_usado,
      tokens_ia,
      metadata
    ) VALUES (
      $1,$2,$3,$4,$5,'borrador',$6,NULL,$7,$8,$9,$10,$11,$12
    )
    RETURNING id`,
    [
      idea.id,
      proposal.title,
      slug,
      idea.categoria_id || null,
      formatoDb,
      autorId,
      proposal.body,
      proposal.body,
      proposal.model || null,
      proposal.prompt_used || null,
      proposal.tokens_used || null,
      meta,
    ]
  );

  const id = res.rows[0]?.id;
  log(`Saved proposal: id=${id} idea=${idea.id} format=${uiFormat}`, 'NEW');
  return { id, skipped: false };
}

async function loadIdeasToProcess({ limit, ideaId }) {
  if (ideaId) {
    const one = await query(
      `SELECT id, titulo, descripcion, fuente::text AS fuente, categoria_id, created_at
       FROM ideas
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [ideaId]
    );
    return one.rows;
  }

  const res = await query(
    `SELECT i.id, i.titulo, i.descripcion, i.fuente::text AS fuente, i.categoria_id, i.created_at
     FROM ideas i
     WHERE i.deleted_at IS NULL
       AND i.estado IN ('nueva','aprobada')
       AND NOT EXISTS (
         SELECT 1 FROM piezas_contenido pc
         WHERE pc.deleted_at IS NULL
           AND pc.idea_id = i.id
           AND (pc.metadata->>'service') = 'content_generator'
       )
     ORDER BY i.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

async function run() {
  log('Starting content generator');

  const systemPrompt = loadSystemPrompt();
  const aiCfg = loadAiConfig();
  const autorId = await getSystemUserId();

  const limit = Number(process.env.CONTENT_GENERATOR_LIMIT || '3');
  const ideaId = process.env.CONTENT_GENERATOR_IDEA_ID || null;

  const ideas = await loadIdeasToProcess({ limit: Number.isFinite(limit) ? limit : 3, ideaId });
  if (!ideas.length) {
    log('No ideas to process', 'INFO');
    return;
  }

  const formats = ['nota', 'post', 'audio', 'video', 'meme', 'infografia'];
  let saved = 0;
  let skipped = 0;

  for (const idea of ideas) {
    log(`Processing idea: ${idea.id} "${idea.titulo}"`);

    for (const format of formats) {
      try {
        const proposal = await generateProposal(idea, format, systemPrompt, aiCfg);
        const result = await saveProposalToDb({ idea, proposal, autorId });
        if (result.skipped) skipped += 1;
        else saved += 1;
      } catch (e) {
        log(`Error generating/saving format=${format} idea=${idea.id}: ${e.message}`, 'ERROR');
      }
    }

    // Mark idea as "en_produccion" once proposals exist
    await query("UPDATE ideas SET estado = 'en_produccion' WHERE id = $1 AND estado = 'nueva'", [idea.id]);
  }

  log(`Content generator completed. saved=${saved} skipped=${skipped}`);
}

module.exports = {
  run,
  generateProposal,
  saveProposalToDb,
  loadSystemPrompt,
  loadAiConfig,
};

if (require.main === module) {
  run().catch((err) => {
    log(`Fatal error: ${err.message}`, 'ERROR');
    process.exit(1);
  });
}


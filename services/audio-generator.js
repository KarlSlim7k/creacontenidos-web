#!/usr/bin/env node
/**
 * Audio Generator Service - CREA Contenidos (Fase 7)
 *
 * Procesa assets encolados (tipo: audio) en `assets_multimedia`,
 * genera audio (MP3) con ElevenLabs TTS o dry-run, guarda archivo en:
 *   apps/web/assets/audio/
 * y actualiza `assets_multimedia` (estado/file_path/metadata).
 *
 * Uso:
 *   node services/audio-generator.js
 *
 * Env opcional:
 *   AUDIO_GENERATOR_LIMIT=5
 *   AUDIO_GENERATOR_ASSET_ID=<uuid>
 */

const fs = require('fs');
const path = require('path');

const { query } = require('./lib/db');
const { callElevenLabsTTS } = require('./lib/api-clients');

const OUT_DIR = path.join(__dirname, '..', 'apps', 'web', 'assets', 'audio');

const LOG_PREFIX = '[AudioGenerator]';

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} [${timestamp}] [${type}] ${message}`);
}

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function safeFilename(prefix, assetId) {
  if (assetId) return `${prefix}_${assetId}.mp3`;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}_${ts}_${rand}.mp3`;
}

function htmlToText(html) {
  if (!html) return '';
  const s = String(html);
  return s
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function safeMeta(asset) {
  let meta = asset.metadata || {};
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  return meta && typeof meta === 'object' ? meta : {};
}

function buildText(asset) {
  const meta = safeMeta(asset);
  const params = meta.params || {};
  const raw = params.text || asset.original_prompt || '';
  const plain = htmlToText(raw);
  return plain;
}

function pickVoiceAndModel(asset) {
  const meta = safeMeta(asset);
  const params = meta.params || {};
  const voiceId = params.voice_id || params.voiceId || null;
  const modelId = params.model_id || params.modelId || null;
  return { voiceId, modelId };
}

async function claimQueuedAssets({ limit, assetId }) {
  const metaPatch = { processing_started_at: new Date().toISOString() };

  if (assetId) {
    const one = await query(
      `UPDATE assets_multimedia
       SET estado = 'processing',
           metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
       WHERE id = $1 AND estado = 'queued' AND tipo = 'audio'
       RETURNING id, pieza_id, tipo, original_prompt, file_path, estado, metadata, created_at`,
      [assetId, JSON.stringify(metaPatch)]
    );
    return one.rows;
  }

  const res = await query(
    `WITH cte AS (
      SELECT id
      FROM assets_multimedia
      WHERE estado = 'queued'
        AND tipo = 'audio'
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE assets_multimedia a
    SET estado = 'processing',
        metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
    FROM cte
    WHERE a.id = cte.id
    RETURNING a.id, a.pieza_id, a.tipo, a.original_prompt, a.file_path, a.estado, a.metadata, a.created_at`,
    [limit, JSON.stringify(metaPatch)]
  );
  return res.rows;
}

async function markDone({ id, filePath, metaPatch }) {
  await query(
    `UPDATE assets_multimedia
     SET estado = 'generated',
         file_path = $2,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
     WHERE id = $1`,
    [id, filePath, JSON.stringify(metaPatch || {})]
  );
}

async function markFailed({ id, error, dryRun }) {
  await query(
    `UPDATE assets_multimedia
     SET estado = 'failed',
         metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
     WHERE id = $1`,
    [id, JSON.stringify({ error: error || 'Error', dry_run: !!dryRun, failed_at: new Date().toISOString() })]
  );
}

async function processAsset(asset) {
  ensureDir(OUT_DIR);

  const text = buildText(asset);
  if (!text) {
    await markFailed({ id: asset.id, error: 'Texto vacío', dryRun: true });
    return { ok: false };
  }

  const { voiceId, modelId } = pickVoiceAndModel(asset);

  log(`Generating audio asset=${asset.id} voice_id=${voiceId || '(default)'} model_id=${modelId || '(default)'}`);

  try {
    const res = await callElevenLabsTTS({ text, voiceId, modelId });
    const filename = safeFilename('audio', asset.id);
    const absPath = path.join(OUT_DIR, filename);
    const relPath = `/assets/audio/${filename}`;

    const usedVoiceId = res.raw?.voice_id || voiceId || process.env.ELEVENLABS_VOICE_ID;
    const usedModelId = res.raw?.model_id || modelId || process.env.ELEVENLABS_MODEL_ID;
    const metaBase = {
      voice_id: usedVoiceId,
      model_id: usedModelId,
      content_type: res.contentType || 'audio/mpeg',
      text_len: text.length,
      generated_at: new Date().toISOString(),
    };

    if (res.dry_run) {
      await markDone({
        id: asset.id,
        filePath: relPath,
        metaPatch: {
          ...metaBase,
          dry_run: true,
        },
      });
      return { ok: true, dry_run: true, file_path: relPath };
    }

    const buf = res.audioBuffer;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      await markFailed({ id: asset.id, error: 'ElevenLabs response sin bytes', dryRun: false });
      return { ok: false };
    }

    fs.writeFileSync(absPath, buf);

    await markDone({
      id: asset.id,
      filePath: relPath,
      metaPatch: {
        ...metaBase,
        dry_run: false,
        bytes: buf.length,
      },
    });

    return { ok: true, dry_run: false, file_path: relPath };
  } catch (e) {
    await markFailed({ id: asset.id, error: e.message, dryRun: false });
    return { ok: false };
  }
}

async function run() {
  const limit = Number(getEnv('AUDIO_GENERATOR_LIMIT', '5')) || 5;
  const assetId = getEnv('AUDIO_GENERATOR_ASSET_ID', '') || null;

  log(`Starting. limit=${limit}${assetId ? ` asset_id=${assetId}` : ''}`);

  const assets = await claimQueuedAssets({ limit, assetId });
  if (!assets.length) {
    log('No queued audio assets');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const asset of assets) {
    const result = await processAsset(asset);
    if (result.ok) ok += 1;
    else fail += 1;
  }

  log(`Completed. ok=${ok} failed=${fail}`);
}

module.exports = { run };

if (require.main === module) {
  run().catch((e) => {
    log(`Fatal error: ${e.message}`, 'ERROR');
    process.exit(1);
  });
}

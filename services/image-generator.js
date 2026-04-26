#!/usr/bin/env node
/**
 * Image Generator Service - CREA Contenidos (Fase 7)
 *
 * Procesa assets encolados (tipo: image|meme|infographic) en `assets_multimedia`,
 * genera imagen con OpenAI (DALL·E) o dry-run, guarda PNG en:
 *   apps/web/assets/img/generated/
 * y actualiza `assets_multimedia` (estado/file_path/metadata).
 *
 * Uso:
 *   node services/image-generator.js
 *
 * Env opcional:
 *   IMAGE_GENERATOR_LIMIT=5
 *   IMAGE_GENERATOR_ASSET_ID=<uuid>
 *   OPENAI_IMAGE_MODEL=dall-e-3
 *   OPENAI_IMAGE_SIZE=1024x1024
 */

const fs = require('fs');
const path = require('path');

const { query } = require('./lib/db');
const { callOpenAIImage } = require('./lib/api-clients');

const OUT_DIR = path.join(__dirname, '..', 'apps', 'web', 'assets', 'img', 'generated');

const LOG_PREFIX = '[ImageGenerator]';

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

async function downloadToBuffer(url) {
  if (typeof fetch === 'function') {
    const r = await fetch(url);
    return Buffer.from(await r.arrayBuffer());
  }

  const https = require('https');
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.end();
  });
}

function safeFilename(prefix) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}_${ts}_${rand}.png`;
}

function buildPrompt(asset) {
  let meta = asset.metadata || {};
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  const params = meta.params || {};
  const tipo = asset.tipo;

  if (tipo === 'image') return String(params.prompt || asset.original_prompt || '').trim();

  if (tipo === 'meme') {
    const imagePrompt = String(params.image_prompt || asset.original_prompt || '').trim();
    const top = String(params.top_text || '').trim();
    const bottom = String(params.bottom_text || '').trim();
    return `${imagePrompt}\n\nMeme text:\nTop: "${top}"\nBottom: "${bottom}"`.trim();
  }

  if (tipo === 'infographic') {
    const topic = String(params.topic || asset.original_prompt || '').trim();
    const data = params.data || [];
    return `Infografía informativa sobre: ${topic}\nDatos: ${JSON.stringify(data)}`;
  }

  return String(asset.original_prompt || '').trim();
}

async function claimQueuedAssets({ limit, assetId }) {
  if (assetId) {
    const one = await query(
      `UPDATE assets_multimedia
       SET estado = 'processing',
           metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
       WHERE id = $1 AND estado = 'queued'
       RETURNING id, pieza_id, tipo, original_prompt, file_path, estado, metadata, created_at`,
      [assetId, JSON.stringify({ processing_started_at: new Date().toISOString() })]
    );
    return one.rows;
  }

  const res = await query(
    `WITH cte AS (
      SELECT id
      FROM assets_multimedia
      WHERE estado = 'queued'
        AND tipo IN ('image','meme','infographic')
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
    [limit, JSON.stringify({ processing_started_at: new Date().toISOString() })]
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

  const prompt = buildPrompt(asset);
  if (!prompt) {
    await markFailed({ id: asset.id, error: 'Prompt vacío', dryRun: true });
    return { ok: false };
  }

  const model = getEnv('OPENAI_IMAGE_MODEL', 'dall-e-3');
  const size = getEnv('OPENAI_IMAGE_SIZE', '1024x1024');

  log(`Generating image asset=${asset.id} tipo=${asset.tipo} size=${size}`);

  try {
    const res = await callOpenAIImage({ prompt, model, size });
    const filename = safeFilename(asset.tipo);
    const absPath = path.join(OUT_DIR, filename);
    const relPath = `/assets/img/generated/${filename}`;

    if (res.dry_run) {
      // No bytes to write; still record a stable path placeholder (no file).
      await markDone({
        id: asset.id,
        filePath: relPath,
        metaPatch: {
          dry_run: true,
          model: res.model,
          revised_prompt: res.revised_prompt || null,
          generated_at: new Date().toISOString(),
        },
      });
      return { ok: true, dry_run: true, file_path: relPath };
    }

    if (res.b64) {
      const buf = Buffer.from(res.b64, 'base64');
      fs.writeFileSync(absPath, buf);
    } else if (res.url) {
      // Fallback: download
      const b = await downloadToBuffer(res.url);
      fs.writeFileSync(absPath, b);
    } else {
      await markFailed({ id: asset.id, error: 'OpenAI response sin b64/url', dryRun: false });
      return { ok: false };
    }

    await markDone({
      id: asset.id,
      filePath: relPath,
      metaPatch: {
        dry_run: false,
        model: res.model,
        revised_prompt: res.revised_prompt || null,
        generated_at: new Date().toISOString(),
      },
    });

    return { ok: true, dry_run: false, file_path: relPath };
  } catch (e) {
    await markFailed({ id: asset.id, error: e.message, dryRun: false });
    return { ok: false };
  }
}

async function run() {
  const limit = Number(getEnv('IMAGE_GENERATOR_LIMIT', '5')) || 5;
  const assetId = getEnv('IMAGE_GENERATOR_ASSET_ID', '') || null;

  log(`Starting. limit=${limit}${assetId ? ` asset_id=${assetId}` : ''}`);

  const assets = await claimQueuedAssets({ limit, assetId });
  if (!assets.length) {
    log('No queued image assets');
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

#!/usr/bin/env node
/**
 * Publication Hub - CREA Contenidos (Fase 6)
 *
 * Procesa publicaciones programadas en PostgreSQL (`publicaciones`) y ejecuta
 * la distribución por canal (Facebook en esta fase).
 *
 * Dry-run:
 * - Si faltan `FB_PAGE_ACCESS_TOKEN` o `FB_PAGE_ID`, marca como `fallida` con
 *   error `[DRY-RUN]` (no hace llamada real).
 *
 * Uso:
 *   node services/publication-hub.js
 *
 * Env opcional:
 *   PUBLICATION_HUB_LIMIT=10
 */

const { query } = require('./lib/db');

const LOG_PREFIX = '[PublicationHub]';

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} [${timestamp}] [${type}] ${message}`);
}

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function stripMarkdown(md) {
  if (!md) return '';
  return String(md)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFacebookMessage(piece) {
  const title = piece?.titulo || '';
  const body = stripMarkdown(piece?.contenido_markdown || '');
  const excerpt = body.slice(0, 260);
  const url = piece?.wordpress_url || piece?.url_publicacion || null;

  const parts = [];
  if (title) parts.push(title);
  if (excerpt) parts.push(excerpt + (body.length > excerpt.length ? '…' : ''));
  if (url) parts.push(url);
  return parts.filter(Boolean).join('\n\n').trim();
}

async function facebookPost({ pageId, accessToken, message, apiVersion = 'v18.0' }) {
  const url = `https://graph.facebook.com/${apiVersion}/${pageId}/feed`;
  const body = new URLSearchParams({ message, access_token: accessToken }).toString();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.error?.message || text || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: msg, raw: json || text };
  }

  return { ok: true, status: res.status, id: json?.id || null, raw: json };
}

async function publishToFacebook(publicationRow) {
  const accessToken = getEnv('FB_PAGE_ACCESS_TOKEN', '');
  const pageId = getEnv('FB_PAGE_ID', '');
  const apiVersion = getEnv('FB_API_VERSION', 'v18.0');

  const message = buildFacebookMessage(publicationRow);

  if (!pageId || !accessToken) {
    log(`[DRY-RUN] Facebook publish skipped: missing FB_PAGE_ID/FB_PAGE_ACCESS_TOKEN (pub=${publicationRow.publicacion_id})`, 'WARN');
    return {
      ok: false,
      dry_run: true,
      error: '[DRY-RUN] Facebook token/page_id no configurado',
      id_externo: null,
      url_publicacion: null,
    };
  }

  const result = await facebookPost({ pageId, accessToken, message, apiVersion });
  if (!result.ok) {
    return {
      ok: false,
      dry_run: false,
      error: result.error || 'Error publicando en Facebook',
      id_externo: null,
      url_publicacion: null,
    };
  }

  const fbId = result.id;
  const url = fbId ? `https://www.facebook.com/${fbId}` : null;
  return {
    ok: true,
    dry_run: false,
    error: null,
    id_externo: fbId || null,
    url_publicacion: url,
  };
}

async function markPublicationSuccess({ id, idExterno, urlPublicacion }) {
  await query(
    `UPDATE publicaciones
     SET estado = 'publicada',
         publicada_en = NOW(),
         id_externo = COALESCE($2, id_externo),
         url_publicacion = COALESCE($3, url_publicacion),
         error_detalle = NULL,
         metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
     WHERE id = $1`,
    [
      id,
      idExterno,
      urlPublicacion,
      JSON.stringify({ last_attempt_at: new Date().toISOString() }),
    ]
  );
}

async function markPublicationFailed({ id, error, dryRun }) {
  await query(
    `UPDATE publicaciones
     SET estado = 'fallida',
         error_detalle = $2,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
     WHERE id = $1`,
    [
      id,
      error || 'Error',
      JSON.stringify({ last_attempt_at: new Date().toISOString(), dry_run: !!dryRun }),
    ]
  );
}

async function loadPendingFacebookPublications(limit) {
  const res = await query(
    `SELECT
      p.id AS publicacion_id,
      p.pieza_id,
      p.programada_para,
      p.copy_canal,
      p.url_publicacion,
      pc.titulo,
      pc.contenido_markdown,
      pc.wordpress_url
     FROM publicaciones p
     JOIN piezas_contenido pc ON pc.id = p.pieza_id
     WHERE p.deleted_at IS NULL
       AND p.canal = 'facebook'
       AND p.estado = 'programada'
       AND (p.programada_para IS NULL OR p.programada_para <= NOW())
     ORDER BY p.created_at ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

async function run() {
  const limit = Number(getEnv('PUBLICATION_HUB_LIMIT', '10')) || 10;
  log(`Starting publication hub. limit=${limit}`);

  const pubs = await loadPendingFacebookPublications(limit);
  if (!pubs.length) {
    log('No pending Facebook publications');
    return;
  }

  let okCount = 0;
  let failCount = 0;

  for (const pub of pubs) {
    log(`Publishing to Facebook: pub=${pub.publicacion_id} pieza=${pub.pieza_id}`);
    try {
      const result = await publishToFacebook(pub);
      if (result.ok) {
        await markPublicationSuccess({
          id: pub.publicacion_id,
          idExterno: result.id_externo,
          urlPublicacion: result.url_publicacion,
        });
        okCount += 1;
        log(`Facebook published: pub=${pub.publicacion_id}`, 'OK');
      } else {
        await markPublicationFailed({
          id: pub.publicacion_id,
          error: result.error,
          dryRun: result.dry_run,
        });
        failCount += 1;
        log(`Facebook publish failed: pub=${pub.publicacion_id} (${result.error})`, 'ERROR');
      }
    } catch (e) {
      await markPublicationFailed({
        id: pub.publicacion_id,
        error: e.message || 'Error',
        dryRun: false,
      });
      failCount += 1;
      log(`Facebook publish exception: pub=${pub.publicacion_id} (${e.message})`, 'ERROR');
    }
  }

  log(`Publication hub completed. ok=${okCount} failed=${failCount}`);
}

module.exports = {
  run,
};

if (require.main === module) {
  run().catch((err) => {
    log(`Fatal error: ${err.message}`, 'ERROR');
    process.exit(1);
  });
}


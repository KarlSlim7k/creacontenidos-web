#!/usr/bin/env node
/**
 * Social Listening Service - CREA Contenidos
 * 
 * Este script se ejecuta via cron cada 30 minutos.
 * Modo dry-run automático si no hay API keys.
 * 
 * Uso: node services/social-listener.js
 */

const path = require('path');
const https = require('https');
const http = require('http');

const { query, withClient, getSystemUserId } = require('./lib/db');
const { callPerplexity } = require('./lib/api-clients');

const CONFIG_FILE = path.join(__dirname, '..', 'config', 'social-listening.json');
const CONFIG_EXAMPLE_FILE = path.join(__dirname, '..', 'config', 'social-listening.example.json');

const LOG_PREFIX = '[SocialListener]';

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} [${timestamp}] [${type}] ${message}`);
}

function loadConfig() {
  const fs = require('fs');
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  if (fs.existsSync(CONFIG_EXAMPLE_FILE)) {
    log('Using social-listening.example.json (no social-listening.json found)', 'WARN');
    return JSON.parse(fs.readFileSync(CONFIG_EXAMPLE_FILE, 'utf8'));
  }

  log('No social-listening config found. Using built-in defaults.', 'WARN');
  return {
    sources: {
      perplexity: { enabled: false, query: 'noticias hoy Perote Veracruz Mexico' },
      rss_feeds: [],
    },
    sentiment_keywords: { positive: [], negative: [], neutral: [] },
    topics_retention_days: 30,
  };
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractFirstTagValue(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? decodeHtmlEntities(m[1]) : null;
}

function extractAtomLink(entryXml) {
  const m = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
  return m ? decodeHtmlEntities(m[1]) : null;
}

function parseRssOrAtom(xmlText) {
  const xml = xmlText || '';
  const items = [];

  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const itemXml of itemMatches) {
    const title = extractFirstTagValue(itemXml, 'title');
    const link = extractFirstTagValue(itemXml, 'link');
    const pubDate = extractFirstTagValue(itemXml, 'pubDate') || extractFirstTagValue(itemXml, 'dc:date');
    const description = stripTags(extractFirstTagValue(itemXml, 'description') || '');
    if (!title) continue;
    items.push({ title, link, pubDate, description });
  }

  if (items.length) return items;

  const entryMatches = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  for (const entryXml of entryMatches) {
    const title = extractFirstTagValue(entryXml, 'title');
    const link = extractAtomLink(entryXml);
    const pubDate = extractFirstTagValue(entryXml, 'updated') || extractFirstTagValue(entryXml, 'published');
    const summary = stripTags(extractFirstTagValue(entryXml, 'summary') || extractFirstTagValue(entryXml, 'content') || '');
    if (!title) continue;
    items.push({ title, link, pubDate, description: summary });
  }

  return items;
}

/**
 * Fetch and parse RSS feed
 * Parser nativo (sin dependencias): https/http + extracción simple XML (RSS 2.0 / Atom)
 */
async function parseRSSFeed(feedUrl, feedName) {
  log(`Parsing RSS feed: ${feedName} (${feedUrl})`);
  
  const maxRedirects = 5;

  const fetchText = (url, redirectsLeft) =>
    new Promise((resolve, reject) => {
      const mod = url.startsWith('https:') ? https : http;
      const req = mod.request(url, { method: 'GET', headers: { 'User-Agent': 'CREA-SocialListener/1.0' } }, (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
          const nextUrl = new URL(location, url).toString();
          res.resume();
          return resolve(fetchText(nextUrl, redirectsLeft - 1));
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.end();
    });

  try {
    const xmlText = await fetchText(feedUrl, maxRedirects);
    const parsed = parseRssOrAtom(xmlText);
    log(`RSS parsed: ${feedName} items=${parsed.length}`);
    return parsed;
  } catch (e) {
    log(`RSS fetch/parse failed for ${feedName}: ${e.message}`, 'ERROR');
    return [];
  }
}

/**
 * Basic keyword-based sentiment analysis
 */
function analyzeSentiment(text, sentimentConfig) {
  const lowerText = text.toLowerCase();
  
  const positiveCount = sentimentConfig.positive
    .filter(kw => lowerText.includes(kw)).length;
  const negativeCount = sentimentConfig.negative
    .filter(kw => lowerText.includes(kw)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Suggest content formats based on sentiment and keywords
 */
function suggestFormats(text, sentiment) {
  const formats = ['nota'];
  const lowerText = text.toLowerCase();
  
  if (sentiment === 'negative') {
    formats.push('alerta');
    if (lowerText.includes('accidente') || lowerText.includes('sismo')) {
      formats.push('infografia');
    }
  }
  
  if (lowerText.includes('inauguración') || lowerText.includes('anuncio')) {
    formats.push('comunicado');
  }
  
  if (lowerText.includes('protesta') || lowerText.includes('manifestación')) {
    formats.push('cobertura');
  }
  
  return formats;
}

function normalizeTitle(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;

  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }

  return v1[bl];
}

function isSimilarTitle(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const ratio = maxLen ? dist / maxLen : 1;
  return ratio <= 0.18 || dist <= 6;
}

function uiFuenteToDbFuente(source) {
  const s = String(source || '').toLowerCase();
  if (s.includes('perplexity')) return 'perplexity_signal';
  if (s.startsWith('rss_')) return 'alerta_google_news';
  if (s.includes('google')) return 'alerta_google_news';
  return 'director_editorial';
}

function urgencyFromSentiment(sentiment) {
  if (sentiment === 'negative') return 'alta';
  return 'media';
}

async function upsertIdeaFromTopic(topicData, registradoPor) {
  const fuenteDb = uiFuenteToDbFuente(topicData.source);

  const meta = {
    service: 'social_listener',
    status: topicData.status || 'pending',
    source_raw: topicData.source,
    mentions: topicData.mentions || 1,
    sentiment: topicData.sentiment || 'neutral',
    suggested_formats: topicData.suggested_formats || ['nota'],
    url: topicData.url || null,
    feed: topicData.feed || null,
    published_at: topicData.published_at || null,
    last_seen_at: new Date().toISOString(),
  };

  // Try to find similar idea recently created by this service (same source/fuente)
  const recent = await query(
    "SELECT id, titulo, metadata FROM ideas WHERE deleted_at IS NULL AND metadata->>'service'='social_listener' AND fuente = $1 AND created_at > (NOW() - interval '14 days') ORDER BY created_at DESC LIMIT 200",
    [fuenteDb]
  );

  for (const row of recent.rows) {
    if (isSimilarTitle(row.titulo, topicData.topic)) {
      const existingMeta = row.metadata || {};
      const merged = {
        ...existingMeta,
        ...meta,
        mentions: (existingMeta.mentions || 0) + (meta.mentions || 1),
      };
      await query("UPDATE ideas SET metadata = $2 WHERE id = $1", [row.id, merged]);
      log(`Updated existing idea (dedup): ${topicData.topic}`, 'UPDATE');
      return { id: row.id, action: 'update' };
    }
  }

  const insert = await query(
    `INSERT INTO ideas (titulo, descripcion, fuente, urgencia, estado, potencial_comercial, registrado_por, metadata)
     VALUES ($1, $2, $3, $4, 'nueva', FALSE, $5, $6)
     RETURNING id`,
    [
      topicData.topic,
      topicData.description || null,
      fuenteDb,
      urgencyFromSentiment(topicData.sentiment),
      registradoPor,
      meta,
    ]
  );

  log(`Inserted new idea: ${topicData.topic}`, 'NEW');
  return { id: insert.rows[0]?.id, action: 'insert' };
}

/**
 * Main execution
 */
async function run() {
  log('Starting social listening service');
  
  const config = loadConfig();
  const sentimentConfig = config.sentiment_keywords;
  let topicsAdded = 0;
  const registradoPor = await getSystemUserId();
  
  const candidates = [];

  // Fetch from Perplexity (dry-run if no key)
  if (config.sources.perplexity?.enabled) {
    log(`Fetching Perplexity topics for query: "${config.sources.perplexity.query}"`);
    const perplexityTopics = await callPerplexity(config.sources.perplexity.query);
    for (const item of perplexityTopics) {
      const sentiment = analyzeSentiment(item.title, sentimentConfig);
      candidates.push({
        topic: item.title,
        source: 'perplexity_signal',
        mentions: item.mentions || 1,
        sentiment,
        suggested_formats: suggestFormats(item.title, sentiment),
        published_at: null,
        url: item.url || null,
        description: null,
        status: 'pending',
      });
    }
  }
  
  // Fetch from RSS feeds
  if (config.sources.rss_feeds) {
    for (const feed of config.sources.rss_feeds) {
      const items = await parseRSSFeed(feed.url, feed.name);
      for (const item of items) {
        const sentiment = analyzeSentiment(item.title, sentimentConfig);
        const source = `rss_${feed.name.toLowerCase().replace(/\s+/g, '_')}`;
        candidates.push({
          topic: item.title,
          source,
          mentions: 1,
          sentiment,
          suggested_formats: suggestFormats(item.title, sentiment),
          published_at: item.pubDate || null,
          url: item.link || null,
          description: item.description || null,
          feed: { name: feed.name, url: feed.url },
          status: 'pending',
        });
      }
    }
  }
  
  // Dedup within this run (by normalized title + source)
  const deduped = [];
  const seen = new Set();
  for (const c of candidates) {
    const key = normalizeTitle(c.topic) + '|' + String(c.source || '');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }

  // Persist to PostgreSQL
  for (const c of deduped) {
    await upsertIdeaFromTopic(c, registradoPor);
    topicsAdded++;
  }

  // Cleanup old ideas created by this service
  const retentionDays = config.topics_retention_days || 30;
  const cleaned = await query(
    "UPDATE ideas SET deleted_at = NOW() WHERE deleted_at IS NULL AND metadata->>'service'='social_listener' AND created_at < (NOW() - ($1 || ' days')::interval)",
    [String(retentionDays)]
  );
  if ((cleaned.rowCount || 0) > 0) {
    log(`Cleaned up ${cleaned.rowCount} old ideas (older than ${retentionDays} days)`, 'CLEANUP');
  }

  const total = await query(
    "SELECT COUNT(*)::int AS c FROM ideas WHERE deleted_at IS NULL AND metadata->>'service'='social_listener'"
  );
  log(`Social listening completed. Topics processed: ${topicsAdded}, Total active: ${total.rows[0]?.c ?? 0}`);
}

if (require.main === module) {
  run().catch(err => {
    log(`Fatal error: ${err.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { run, parseRSSFeed, analyzeSentiment };

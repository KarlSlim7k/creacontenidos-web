function nowIso() {
  return new Date().toISOString();
}

function log(message, type = 'INFO') {
  console.log(`[Service] [${nowIso()}] [${type}] ${message}`);
}

class APIError extends Error {
  constructor(message, status, bodyText) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
    this.isAPIError = true;
  }
  isServerError() {
    return typeof this.status === 'number' && this.status >= 500;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, options) {
  if (typeof fetch === 'function') {
    const res = await fetch(url, options);
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text };
  }

  const https = require('https');
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = null;
        }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, text: data });
      });
    });
    req.on('error', reject);
    if (options?.body) req.write(options.body);
    req.end();
  });
}

function safeJsonExtract(content) {
  if (!content) return null;
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = content.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function mockPerplexityTopics(query) {
  return [
    { title: `Radar: ${query} (mock)`, mentions: 1, url: null },
  ];
}

async function callPerplexity(query) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    log('[DRY-RUN] Perplexity query skipped (PERPLEXITY_API_KEY missing)', 'WARN');
    return mockPerplexityTopics(query);
  }

  const body = {
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content:
          'Return ONLY a JSON array of objects: [{"title": "...", "mentions": 1, "url": "https://..."}]. No extra text.',
      },
      { role: 'user', content: query },
    ],
    temperature: 0.2,
    max_tokens: 400,
  };

  const res = await fetchJson('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    log(`Perplexity call failed (status ${res.status}). Falling back to empty list.`, 'ERROR');
    return [];
  }

  const content = res.json?.choices?.[0]?.message?.content || '';
  const extracted = safeJsonExtract(content);
  if (Array.isArray(extracted)) {
    return extracted
      .filter((x) => x && typeof x.title === 'string')
      .map((x) => ({ title: x.title, mentions: Number(x.mentions || 1), url: x.url || null }));
  }

  // If the model returned strict JSON in the root
  if (Array.isArray(res.json)) {
    return res.json;
  }

  log('Perplexity response could not be parsed as JSON array. Returning empty list.', 'WARN');
  return [];
}

function mockClaudeResponse(promptInfo) {
  const topicTitle = promptInfo?.topicTitle || 'Sin título';
  const format = promptInfo?.format || 'nota';
  return {
    title: `[PLACEHOLDER] ${format} — ${topicTitle}`,
    body: `Contenido placeholder para formato ${format}. Editar manualmente.`,
    image_prompt: null,
    ai_label: 'generado',
    model: 'claude-mock',
    tokens_used: 0,
    raw: null,
  };
}

function safeJsonExtractObject(content) {
  if (!content) return null;
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = content.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

async function callClaude({ system, user, model, maxTokens = 900, temperature = 0.2, promptInfo }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    log('[DRY-RUN] Claude skipped (ANTHROPIC_API_KEY missing)', 'WARN');
    return mockClaudeResponse(promptInfo);
  }

  const payload = {
    model: model || 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature,
    system: system || '',
    messages: [{ role: 'user', content: user || '' }],
  };

  const attempt = async () => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetchJson('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new APIError(`Claude call failed (status ${res.status})`, res.status, res.text);
      }
      const text = res.json?.content?.[0]?.text || '';
      const extracted = safeJsonExtractObject(text);
      const out = extracted && typeof extracted === 'object' ? extracted : { body: text };
      return {
        title: out.title || out.titulo || null,
        body: out.body || out.contenido || out.texto || text || null,
        image_prompt: out.image_prompt || out.prompt_imagen || null,
        ai_label: out.ai_label || out.etiqueta_ia || 'generado',
        model: res.json?.model || payload.model,
        tokens_used: res.json?.usage?.output_tokens ?? null,
        raw: res.json,
      };
    } finally {
      clearTimeout(t);
    }
  };

  for (let i = 0; i < 3; i++) {
    try {
      return await attempt();
    } catch (e) {
      if (e?.name === 'AbortError') {
        log('Claude call timed out. Retrying...', 'WARN');
      } else if (e?.isAPIError && e.isServerError()) {
        log(`Claude server error. Retrying... (${e.message})`, 'WARN');
      } else {
        log(`Claude call failed (non-retryable): ${e.message}`, 'ERROR');
        return mockClaudeResponse(promptInfo);
      }
      await sleep(500 * (i + 1));
    }
  }

  return mockClaudeResponse(promptInfo);
}

module.exports = {
  callPerplexity,
  callClaude,
};

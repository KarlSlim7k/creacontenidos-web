function nowIso() {
  return new Date().toISOString();
}

function log(message, type = 'INFO') {
  console.log(`[Service] [${nowIso()}] [${type}] ${message}`);
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

module.exports = {
  callPerplexity,
};


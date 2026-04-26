#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

let dbModule;

function getDb() {
  if (!dbModule) {
    dbModule = require('./lib/db');
  }
  return dbModule;
}

function query(text, params) {
  return getDb().query(text, params);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function getConfig() {
  const args = parseArgs(process.argv);
  const clientId = args.clientId || process.env.CLIENT_ID || process.env.REPORT_CLIENT_ID;
  const month = Number(args.month || process.env.MONTH || process.env.REPORT_MONTH);
  const year = Number(args.year || process.env.YEAR || process.env.REPORT_YEAR);

  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) {
    throw new Error('client-id inválido o faltante');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('month debe ser un entero entre 1 y 12');
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('year debe ser un entero entre 2000 y 2100');
  }

  return { clientId, month, year };
}

function periodFor(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start),
  };
}

function previousPeriod(year, month) {
  const date = new Date(Date.UTC(year, month - 2, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function currency(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat('es-MX').format(Number(value || 0));
}

function percent(value) {
  if (value === null || value === undefined) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value)}%`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, '')
    .trim();
}

async function fetchClient(clientId) {
  const result = await query(
    `SELECT id, nombre_empresa, contacto_nombre, contacto_email, metadata
     FROM patrocinadores
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [clientId]
  );
  return result.rows[0] || null;
}

async function fetchContract(clientId, period) {
  const result = await query(
    `SELECT id, tipo_producto::text AS tipo_producto, monto_mxn, fecha_inicio, fecha_fin, metadata
     FROM contratos_comerciales
     WHERE patrocinador_id = $1
       AND deleted_at IS NULL
       AND activo = TRUE
       AND fecha_inicio < $3::date
       AND (fecha_fin IS NULL OR fecha_fin >= $2::date)
     ORDER BY fecha_inicio DESC, created_at DESC
     LIMIT 1`,
    [clientId, period.start, period.end]
  );
  return result.rows[0] || null;
}

async function fetchPublications(clientId, period) {
  const result = await query(
    `WITH latest_metrics AS (
       SELECT DISTINCT ON (mp.pieza_id, mp.canal)
         mp.pieza_id,
         mp.canal::text AS canal,
         mp.vistas_unicas,
         mp.likes,
         mp.comentarios,
         mp.compartidos,
         mp.guardados,
         mp.clics_enlace
       FROM metricas_piezas mp
       WHERE mp.fecha_captura >= $2::date
         AND mp.fecha_captura < $3::date
       ORDER BY mp.pieza_id, mp.canal, mp.fecha_captura DESC, mp.created_at DESC
     ),
     report_rows AS (
       SELECT
         pc.id AS pieza_id,
         pc.titulo,
         pc.formato::text AS formato,
         pc.wordpress_url,
         pub.id AS publicacion_id,
         pub.canal::text AS canal,
         pub.url_publicacion,
         COALESCE(pub.publicada_en, pub.programada_para, pc.fecha_publicacion, pc.created_at) AS report_date
       FROM piezas_contenido pc
       LEFT JOIN publicaciones pub ON pub.pieza_id = pc.id
       WHERE pc.patrocinador_id = $1
         AND pc.deleted_at IS NULL
     )
     SELECT
       r.*,
       COALESCE(m.views, 0)::int AS views,
       COALESCE(m.interactions, 0)::int AS interactions
     FROM report_rows r
     LEFT JOIN LATERAL (
       SELECT
         SUM(lm.vistas_unicas)::int AS views,
         SUM(lm.likes + lm.comentarios + lm.compartidos + lm.guardados + lm.clics_enlace)::int AS interactions
       FROM latest_metrics lm
       WHERE lm.pieza_id = r.pieza_id
         AND (r.canal IS NULL OR lm.canal = r.canal)
     ) m ON TRUE
     WHERE r.report_date >= $2::timestamptz
       AND r.report_date < $3::timestamptz
     ORDER BY r.report_date ASC, r.titulo ASC`,
    [clientId, period.start, period.end]
  );
  return result.rows;
}

function summarize(publications, investment) {
  const views = publications.reduce((sum, item) => sum + Number(item.views || 0), 0);
  const interactions = publications.reduce((sum, item) => sum + Number(item.interactions || 0), 0);
  return {
    views,
    interactions,
    cpm: views > 0 ? (Number(investment || 0) / views) * 1000 : 0,
  };
}

function comparison(current, previous) {
  const viewsChange = previous.views > 0 ? ((current.views - previous.views) / previous.views) * 100 : null;
  const interactionsChange = previous.interactions > 0
    ? ((current.interactions - previous.interactions) / previous.interactions) * 100
    : null;
  return { viewsChange, interactionsChange };
}

function buildHtml(report) {
  const rows = report.publications.map((item) => `
    <tr>
      <td>${escapeHtml(new Date(item.report_date).toLocaleDateString('es-MX', { timeZone: 'UTC' }))}</td>
      <td>
        <strong>${escapeHtml(item.titulo)}</strong>
        <small>${escapeHtml(item.url_publicacion || item.wordpress_url || '')}</small>
      </td>
      <td>${escapeHtml(item.formato || 'contenido')}</td>
      <td>${escapeHtml(item.canal || 'web')}</td>
      <td class="num">${number(item.views)}</td>
      <td class="num">${number(item.interactions)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <title>Reporte mensual ${escapeHtml(report.client.nombre_empresa)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #18212f; background: #f6f8fb; }
    .page { padding: 42px; }
    .sheet { background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden; }
    header { padding: 34px 38px; color: #fff; background: linear-gradient(135deg, #153e75, #16a34a); }
    .brand { font-size: 13px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; opacity: .86; }
    h1 { margin: 10px 0 4px; font-size: 30px; line-height: 1.1; }
    .period { margin: 0; opacity: .9; }
    section { padding: 26px 38px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .metric { padding: 16px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fbfdff; }
    .metric span { display: block; font-size: 12px; color: #64748b; }
    .metric strong { display: block; margin-top: 6px; font-size: 22px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
    .box { padding: 16px; border-radius: 16px; background: #f1f5f9; }
    .box h3 { margin: 0 0 8px; font-size: 14px; }
    .box p { margin: 3px 0; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
    th { text-align: left; padding: 10px 8px; color: #475569; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    td { padding: 11px 8px; border-bottom: 1px solid #edf2f7; vertical-align: top; }
    td small { display: block; margin-top: 3px; color: #64748b; word-break: break-all; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    footer { padding: 22px 38px 34px; color: #475569; }
  </style>
</head>
<body>
  <div class="page">
    <div class="sheet">
      <header>
        <div class="brand">CREA Contenidos</div>
        <h1>Reporte mensual — ${escapeHtml(report.client.nombre_empresa)}</h1>
        <p class="period">${escapeHtml(report.period.label)}</p>
      </header>
      <section>
        <div class="grid">
          <div class="metric"><span>Views</span><strong>${number(report.totals.views)}</strong></div>
          <div class="metric"><span>Interacciones</span><strong>${number(report.totals.interactions)}</strong></div>
          <div class="metric"><span>CPM</span><strong>${currency(report.totals.cpm)}</strong></div>
          <div class="metric"><span>Publicaciones</span><strong>${number(report.publications.length)}</strong></div>
        </div>
        <div class="meta">
          <div class="box">
            <h3>Contrato activo</h3>
            <p>Paquete: ${escapeHtml(report.packageName)}</p>
            <p>Producto: ${escapeHtml(report.contract?.tipo_producto || 'No especificado')}</p>
            <p>Inversión: ${currency(report.investment)}</p>
          </div>
          <div class="box">
            <h3>Comparativo mes anterior</h3>
            <p>Views: ${escapeHtml(percent(report.comparison.viewsChange))}</p>
            <p>Interacciones: ${escapeHtml(percent(report.comparison.interactionsChange))}</p>
            <p>Factura: ${escapeHtml(report.invoiceNumber)}</p>
          </div>
        </div>
        <table>
          <thead><tr><th>Fecha</th><th>Publicación</th><th>Tipo</th><th>Canal</th><th class="num">Views</th><th class="num">Interacciones</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6">No hay publicaciones patrocinadas en el periodo.</td></tr>'}</tbody>
        </table>
      </section>
      <footer>Gracias por confiar en CREA para amplificar tu marca con contenido local de valor.</footer>
    </div>
  </div>
</body>
</html>`;
}

function wrapLine(text, width) {
  const words = sanitizeText(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pdfEscape(value) {
  return sanitizeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function writeMinimalPdf(report, outputPath) {
  const lines = [
    'CREA Contenidos - Reporte mensual',
    `${report.client.nombre_empresa} | ${report.period.label}`,
    `Paquete: ${report.packageName} | Inversión: ${currency(report.investment)}`,
    `Views: ${number(report.totals.views)} | Interacciones: ${number(report.totals.interactions)} | CPM: ${currency(report.totals.cpm)}`,
    `Comparativo views: ${percent(report.comparison.viewsChange)} | Interacciones: ${percent(report.comparison.interactionsChange)}`,
    `Factura: ${report.invoiceNumber}`,
    '',
    'Publicaciones:',
  ];

  if (!report.publications.length) {
    lines.push('Sin publicaciones patrocinadas en el periodo.');
  } else {
    for (const item of report.publications) {
      const date = new Date(item.report_date).toLocaleDateString('es-MX', { timeZone: 'UTC' });
      wrapLine(`${date} - ${item.titulo} (${item.canal || 'web'}): ${number(item.views)} views, ${number(item.interactions)} interacciones`, 92)
        .forEach((line) => lines.push(line));
    }
  }
  lines.push('', 'Gracias por confiar en CREA para amplificar tu marca con contenido local de valor.');

  const visibleLines = lines.slice(0, 48);
  const stream = `BT
/F1 11 Tf
50 790 Td
14 TL
${visibleLines.map((line) => `(${pdfEscape(line)}) Tj T*`).join('\n')}
ET`;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(outputPath, pdf);
}

async function writePdf(html, report, outputPath) {
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    } finally {
      await browser.close();
    }
    return 'puppeteer';
  } catch (error) {
    writeMinimalPdf(report, outputPath);
    return `minimal-pdf:${error.message}`;
  }
}

async function buildReport(config) {
  const period = periodFor(config.year, config.month);
  const previous = previousPeriod(config.year, config.month);
  const previousReportPeriod = periodFor(previous.year, previous.month);

  const client = await fetchClient(config.clientId);
  if (!client) throw new Error('Cliente no encontrado');

  const contract = await fetchContract(config.clientId, period);
  const publications = await fetchPublications(config.clientId, period);
  const previousPublications = await fetchPublications(config.clientId, previousReportPeriod);

  const clientMeta = typeof client.metadata === 'object' ? client.metadata : JSON.parse(client.metadata || '{}');
  const contractMeta = contract?.metadata && typeof contract.metadata === 'object'
    ? contract.metadata
    : JSON.parse(contract?.metadata || '{}');
  const packageName = contractMeta.package || clientMeta.package || contract?.tipo_producto || 'Sin paquete';
  const investment = Number(contract?.monto_mxn || contractMeta.investment || 0);
  const totals = summarize(publications, investment);
  const previousTotals = summarize(previousPublications, investment);
  const monthPadded = String(config.month).padStart(2, '0');

  return {
    client,
    contract,
    publications,
    period,
    packageName,
    investment,
    totals,
    previousTotals,
    comparison: comparison(totals, previousTotals),
    invoiceNumber: contractMeta.invoice_number || contractMeta.factura || `CREA-${config.year}${monthPadded}-${config.clientId.slice(0, 8)}`,
  };
}

async function main() {
  const config = getConfig();
  const monthPadded = String(config.month).padStart(2, '0');
  const filename = `reporte_${config.clientId}_${config.year}_${monthPadded}.pdf`;
  const reportDir = path.resolve(__dirname, '../apps/web/assets/reports');
  const outputPath = path.join(reportDir, filename);
  const url = `/assets/reports/${filename}`;

  fs.mkdirSync(reportDir, { recursive: true });

  const report = await buildReport(config);
  const html = buildHtml(report);
  const renderer = await writePdf(html, report, outputPath);

  process.stdout.write(JSON.stringify({ ok: true, url, path: outputPath, renderer }) + '\n');
}

main()
  .catch((error) => {
    process.stderr.write(`[report-generator] ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dbModule) {
      await dbModule.getPool().end().catch(() => {});
    }
  });

(() => {
  const API = {
    articles: '/api/articles/crud.php',
    subscribers: '/api/newsletter/list.php',
    clients: '/api/clients/crud.php',
    metrics: '/api/dashboard/metrics.php',
    logout: '/api/auth/logout.php'
  };

  async function loadDashboard() {
    try {
      const [artRes, subRes, cliRes, metricsRes] = await Promise.all([
        CreaCRM.api.apiFetch(API.articles),
        CreaCRM.api.apiFetch(API.subscribers).catch(() => ({ ok: false })),
        CreaCRM.api.apiFetch(API.clients).catch(() => ({ ok: false })),
        CreaCRM.api.apiFetch(API.metrics).catch(() => ({ ok: false }))
      ]);

      const articles = artRes.ok ? (await artRes.json()).articles || [] : [];
      const published = articles.filter(a => a.estado === 'publicada');
      const drafts = articles.filter(a => a.estado === 'borrador');

      setText('stat-total', articles.length);
      setText('stat-published', published.length);
      setText('stat-drafts', drafts.length);

      if (subRes.ok) {
        const subData = await subRes.json();
        setText('stat-subscribers', subData.total || 0);
      }

      if (cliRes.ok) {
        const cliData = await cliRes.json();
        const activeClients = (cliData.clients || []).filter(c => c.active).length;
        setText('stat-clients', activeClients);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        renderMetrics(metricsData);
      } else {
        renderMetrics({ totals: {}, series: [], source: 'sin datos' });
      }

      renderArticles(articles.slice(0, 8));
    } catch (err) {
      console.error('Error loading dashboard:', err);
      const list = document.getElementById('articles-list');
      if (list) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__text">Error cargando datos</div></div>';
      }
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function renderMetrics(data) {
    const totals = data.totals || {};
    const series = Array.isArray(data.series) ? data.series : [];
    const source = data.source === 'metricas_piezas' ? 'Piezas' : data.source === 'metricas_semanales' ? 'Semanal' : 'Sin datos';

    setText('stat-views', formatNumber(totals.views));
    setText('stat-interactions', formatNumber(totals.interactions));
    setText('stat-followers', formatNumber(totals.followers));
    setText('metrics-source', source);

    drawMiniChart('chart-views', series.map(item => item.views || 0), '#2563eb');
    drawMiniChart('chart-interactions', series.map(item => item.interactions || 0), '#E8871E');
    drawMiniChart('chart-followers', series.map(item => item.followers || 0), '#0A8F6C');
  }

  function drawMiniChart(canvasId, values, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 6;
    const chartValues = values.length ? values : [0, 0, 0, 0, 0, 0, 0, 0];
    const maxValue = Math.max(...chartValues, 1);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    if (chartValues.every(value => Number(value || 0) === 0)) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Sin datos', padding, 18);
      return;
    }

    const step = chartValues.length > 1 ? (width - padding * 2) / (chartValues.length - 1) : 0;
    const points = chartValues.map((value, index) => ({
      x: padding + index * step,
      y: height - padding - (Number(value || 0) / maxValue) * (height - padding * 2)
    }));

    const gradient = ctx.createLinearGradient(0, padding, 0, height);
    gradient.addColorStop(0, color + '33');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.lineTo(points[0].x, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function renderArticles(articles) {
    const list = document.getElementById('articles-list');
    if (!list) return;

    if (articles.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📝</div><div class="empty-state__text">No hay artículos aún</div><div class="empty-state__sub">Crea el primer artículo desde el botón superior</div></div>';
      return;
    }

    list.innerHTML = articles.map(art => `
      <div class="dash-article-item" data-id="${art.id}" onclick="window.location.href='/admin/articulos.html'">
        <div class="dash-article-item__info">
          <div class="dash-article-item__title">${CreaCRM.ui.escapeHtml(art.titulo)}</div>
          <div class="dash-article-item__meta">
            <span>${CreaCRM.ui.escapeHtml(art.autor || 'Sin autor')}</span>
            <span>·</span>
            <span>${CreaCRM.ui.formatDate(art.fecha_publicacion || art.created_at)}</span>
            <span>·</span>
            <span>${CreaCRM.ui.escapeHtml(art.categoria || '')}</span>
          </div>
        </div>
        <span class="dash-badge dash-badge--${art.estado === 'publicada' ? 'published' : 'draft'}">${art.estado}</span>
      </div>
    `).join('');
  }

  // Init
  if (!CreaCRM.auth.requireAuth()) return;

  loadDashboard();

  document.getElementById('btn-logout')?.addEventListener('click', CreaCRM.auth.handleLogout);

  document.getElementById('btn-new-article')?.addEventListener('click', () => {
    window.location.href = '/admin/articulos.html?new=true';
  });

  document.getElementById('btn-view-site')?.addEventListener('click', () => {
    window.open('/', '_blank');
  });

  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    loadDashboard();
    CreaCRM.ui.showToast('Datos actualizados', 'ok');
  });

  // Keyboard shortcuts
  CreaCRM.ui.initKeyboardShortcuts({
    'n': () => { window.location.href = '/admin/articulos.html?new=true'; },
    'r': () => { loadDashboard(); },
    'v': () => { window.open('/', '_blank'); }
  });
})();

(() => {
  const API = {
    articles: '/api/articles/crud.php',
    subscribers: '/api/newsletter/list.php',
    clients: '/api/clients/crud.php',
    logout: '/api/auth/logout.php'
  };

  function formatDate(dateStr) {
    if (!dateStr) return 'Sin fecha';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  async function loadDashboard() {
    try {
      const [artRes, subRes, cliRes] = await Promise.all([
        CreaCRM.api.apiFetch(API.articles),
        CreaCRM.api.apiFetch(API.subscribers).catch(() => ({ ok: false })),
        CreaCRM.api.apiFetch(API.clients).catch(() => ({ ok: false }))
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
          <div class="dash-article-item__title">${escapeHtml(art.titulo)}</div>
          <div class="dash-article-item__meta">
            <span>${escapeHtml(art.autor || 'Sin autor')}</span>
            <span>·</span>
            <span>${formatDate(art.fecha_publicacion || art.created_at)}</span>
            <span>·</span>
            <span>${escapeHtml(art.categoria || '')}</span>
          </div>
        </div>
        <span class="dash-badge dash-badge--${art.estado === 'publicada' ? 'published' : 'draft'}">${art.estado}</span>
      </div>
    `).join('');
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Init
  if (!CreaCRM.auth.requireAuth()) return;

  loadDashboard();

  document.getElementById('btn-logout')?.addEventListener('click', CreaCRM.auth.handleLogout);

  document.getElementById('btn-new-article')?.addEventListener('click', () => {
    window.location.href = '/?editor=true';
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
    'n': () => { window.location.href = '/?editor=true'; },
    'r': () => { loadDashboard(); },
    'v': () => { window.open('/', '_blank'); }
  });
})();

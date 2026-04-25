(() => {
  const API = {
    articles: '/api/articles/crud.php',
    subscribers: '/api/newsletter/list.php',
    logout: '/api/auth/logout.php',
    cookieName: 'crea_editor_session'
  };

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function getUserFromToken() {
    const token = getCookie(API.cookieName);
    if (!token) return null;
    try { return JSON.parse(atob(token)); } catch { return null; }
  }

  function isAuthenticated() {
    const user = getUserFromToken();
    if (!user) return false;
    return user.exp > Math.floor(Date.now() / 1000);
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Sin fecha';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // ─── Load stats and articles ───
  async function loadDashboard() {
    try {
      const res = await fetch(API.articles);
      const data = await res.json();
      const articles = data.articles || [];

      const published = articles.filter(a => a.estado === 'publicada');
      const drafts = articles.filter(a => a.estado === 'borrador');

      // Update stat cards
      setText('stat-total', articles.length);
      setText('stat-published', published.length);
      setText('stat-drafts', drafts.length);

      // Load subscriber count
      try {
        const subRes = await fetch(API.subscribers);
        if (subRes.ok) {
          const subData = await subRes.json();
          setText('stat-subscribers', subData.total || 0);
        }
      } catch {
        setText('stat-subscribers', '—');
      }

      // Render recent articles
      renderArticles(articles.slice(0, 8));
    } catch (err) {
      console.error('Error loading dashboard:', err);
      const list = document.getElementById('articles-list');
      if (list) {
        list.innerHTML = '<div class="dash-empty"><div class="dash-empty__icon">⚠️</div><div class="dash-empty__text">Error cargando artículos</div></div>';
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
      list.innerHTML = '<div class="dash-empty"><div class="dash-empty__icon">📝</div><div class="dash-empty__text">No hay artículos aún. ¡Crea el primero!</div></div>';
      return;
    }

    list.innerHTML = articles.map(art => `
      <div class="dash-article-item" data-id="${art.id}">
        <div class="dash-article-item__info">
          <div class="dash-article-item__title">${art.titulo}</div>
          <div class="dash-article-item__meta">
            <span>${art.autor || 'Sin autor'}</span>
            <span>·</span>
            <span>${formatDate(art.fecha_publicacion || art.created_at)}</span>
            <span>·</span>
            <span>${art.categoria || ''}</span>
          </div>
        </div>
        <span class="dash-badge dash-badge--${art.estado === 'publicada' ? 'published' : 'draft'}">${art.estado}</span>
      </div>
    `).join('');
  }

  // ─── User info ───
  function renderUserInfo() {
    const user = getUserFromToken();
    if (!user) return;

    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = user.nombre || user.email;
    if (avatarEl) avatarEl.textContent = (user.nombre || user.email || 'E')[0].toUpperCase();
  }

  // ─── Logout ───
  async function handleLogout() {
    try {
      await fetch(API.logout, { method: 'POST' });
    } catch { /* ignore */ }
    document.cookie = API.cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/admin/login.html';
  }

  // ─── Mobile sidebar toggle ───
  function toggleSidebar() {
    const sidebar = document.getElementById('dash-sidebar');
    const overlay = document.getElementById('dash-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  }

  // ─── Init ───
  function init() {
    if (!requireAuth()) return;

    renderUserInfo();
    loadDashboard();

    // Logout button
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Mobile menu
    const menuBtn = document.getElementById('btn-menu');
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);

    const overlay = document.getElementById('dash-overlay');
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    // Quick actions
    const newArticleBtn = document.getElementById('btn-new-article');
    if (newArticleBtn) {
      newArticleBtn.addEventListener('click', () => {
        window.location.href = '/?editor=true';
      });
    }

    const viewSiteBtn = document.getElementById('btn-view-site');
    if (viewSiteBtn) {
      viewSiteBtn.addEventListener('click', () => {
        window.open('/', '_blank');
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadDashboard());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

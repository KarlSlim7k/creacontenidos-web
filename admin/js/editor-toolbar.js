(() => {
  const API_CONFIG = {
    contentApi: '/api/content/index.php',
    cookieName: 'crea_editor_session'
  };

  let pendingChanges = false;
  let changedBlocks = {};

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isAuthenticated() {
    const token = getCookie(API_CONFIG.cookieName);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .crea-editor-toolbar {
        position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
        background: #1f2937; color: white; height: 3rem;
        display: flex; align-items: center; padding: 0 1rem; gap: 0.75rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .crea-editor-toolbar .indicator {
        display: flex; align-items: center; gap: 0.5rem;
      }
      .crea-editor-toolbar .pulse {
        width: 0.5rem; height: 0.5rem; background: #4ade80;
        border-radius: 50%; animation: pulse 2s infinite;
      }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .crea-editor-toolbar .divider {
        width: 1px; height: 1.25rem; background: #4b5563;
      }
      .crea-editor-toolbar button {
        background: none; border: none; color: #d1d5db;
        font-size: 0.875rem; padding: 0.25rem 0.75rem; border-radius: 0.25rem;
        cursor: pointer; transition: background 0.2s;
      }
      .crea-editor-toolbar button:hover { background: #374151; color: white; }
      .crea-editor-toolbar .publish-btn {
        background: #2563eb; color: white; font-weight: 500;
      }
      .crea-editor-toolbar .publish-btn:hover { background: #1d4ed8; }
      .crea-editor-toolbar .spacer { flex: 1; }
      .crea-editor-toolbar .pending-dot {
        width: 0.375rem; height: 0.375rem; background: #facc15;
        border-radius: 50%; margin-left: 0.25rem;
      }
      .crea-editor-toolbar .preview-link {
        display: flex; align-items: center; gap: 0.25rem;
        color: #d1d5db; font-size: 0.875rem; padding: 0.25rem 0.75rem;
        border-radius: 0.25rem; text-decoration: none;
      }
      .crea-editor-toolbar .preview-link:hover { background: #374151; color: white; }
    `;
    document.head.appendChild(style);
  }

  async function saveDraft() {
    const pageId = document.body.dataset.pageId || 'home';
    try {
      const res = await fetch(`${API_CONFIG.contentApi}?id=${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: changedBlocks, estado: 'borrador' })
      });
      if (res.ok) {
        pendingChanges = false;
        changedBlocks = {};
        showNotification('Borrador guardado');
      }
    } catch (err) {
      showNotification('Error al guardar', 'error');
    }
  }

  async function publish() {
    const pageId = document.body.dataset.pageId || 'home';
    try {
      const res = await fetch(`${API_CONFIG.contentApi}?id=${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: changedBlocks, estado: 'publicada' })
      });
      if (res.ok) {
        pendingChanges = false;
        changedBlocks = {};
        showNotification('¡Cambios publicados!', 'success');
      }
    } catch (err) {
      showNotification('Error al publicar', 'error');
    }
  }

  function showNotification(message, type = 'success') {
    const existing = document.getElementById('crea-notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'crea-notification';
    notif.textContent = message;
    notif.style.cssText = `
      position: fixed; bottom: 5rem; right: 1rem; z-index: 10000;
      background: ${type === 'error' ? '#dc2626' : '#059669'};
      color: white; padding: 0.75rem 1rem; border-radius: 0.5rem;
      font-size: 0.875rem;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  window.creaRegisterChange = (blockId, content) => {
    pendingChanges = true;
    changedBlocks[blockId] = content;
  };

  function render() {
    if (!isAuthenticated()) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'crea-editor-toolbar';
    toolbar.innerHTML = `
      <div class="indicator">
        <span class="pulse"></span>
        <span style="font-size:0.875rem;font-weight:500;">Modo Editor</span>
      </div>
      <div class="divider"></div>
      <button onclick="window.creaSaveDraft()">
        Guardar borrador
        <span class="pending-dot" id="crea-pending-dot" style="display:none;"></span>
      </button>
      <button class="publish-btn" onclick="window.creaPublish()">Publicar</button>
      <div class="divider"></div>
      <button onclick="window.creaOpenArticles()">Artículos</button>
      <button onclick="window.creaOpenSeo()">SEO</button>
      <div class="spacer"></div>
      <a href="/?preview=true" target="_blank" class="preview-link">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Vista pública
      </a>
    `;
    document.body.appendChild(toolbar);

    document.body.style.paddingTop = '3rem';

    window.creaSaveDraft = saveDraft;
    window.creaPublish = publish;
    window.creaOpenArticles = () => { if (typeof window.creaOpenArticlesPanel === 'function') window.creaOpenArticlesPanel(); };
    window.creaOpenSeo = () => { if (typeof window.creaOpenSeoPanel === 'function') window.creaOpenSeoPanel(); };

    setInterval(() => {
      const dot = document.getElementById('crea-pending-dot');
      if (dot) dot.style.display = pendingChanges ? 'inline' : 'none';
    }, 500);
  }

  createStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
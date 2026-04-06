(function() {
  const API_CONFIG = {
    articlesApi: '/api/articles/crud.php',
    cookieName: 'crea_editor_session'
  };

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
      .crea-articles-panel {
        position: fixed; top: 3rem; left: 0; right: 0; bottom: 0;
        z-index: 9997; background: #f3f4f6; display: none;
        flex-direction: column;
      }
      .crea-articles-panel.open { display: flex; }
      .crea-panel-header {
        background: #1f2937; color: white; padding: 1rem;
        display: flex; align-items: center; gap: 1rem;
      }
      .crea-panel-header h3 {
        margin: 0; font-size: 1rem; font-weight: 600;
      }
      .crea-panel-close {
        background: none; border: none; color: #d1d5db;
        cursor: pointer; padding: 0.25rem; margin-left: auto;
        border-radius: 0.25rem;
      }
      .crea-panel-close:hover { background: #374151; color: white; }
      .crea-panel-toolbar {
        background: #374151; padding: 0.75rem 1rem;
        display: flex; align-items: center; gap: 0.5rem;
      }
      .crea-panel-toolbar button {
        background: #4b5563; color: white; border: none;
        padding: 0.5rem 1rem; border-radius: 0.375rem;
        font-size: 0.875rem; cursor: pointer;
      }
      .crea-panel-toolbar button:hover { background: #6b7280; }
      .crea-panel-toolbar .filter-select {
        background: #4b5563; color: white; border: none;
        padding: 0.5rem 1rem; border-radius: 0.375rem;
        font-size: 0.875rem; cursor: pointer; margin-left: auto;
      }
      .crea-articles-list {
        flex: 1; overflow-y: auto; padding: 1rem;
        display: flex; flex-direction: column; gap: 0.75rem;
      }
      .crea-article-card {
        background: white; border-radius: 0.5rem; padding: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer;
        transition: box-shadow 0.2s;
      }
      .crea-article-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
      .crea-article-card.draft { border-left: 4px solid #f59e0b; }
      .crea-article-card.published { border-left: 4px solid #10b981; }
      .crea-article-header {
        display: flex; align-items: flex-start; gap: 0.75rem;
      }
      .crea-article-title {
        font-size: 1rem; font-weight: 600; color: #111;
        margin: 0 0 0.25rem 0;
      }
      .crea-article-meta {
        font-size: 0.75rem; color: #6b7280;
        display: flex; gap: 0.5rem; flex-wrap: wrap;
      }
      .crea-article-badge {
        font-size: 0.625rem; padding: 0.125rem 0.5rem;
        border-radius: 9999px; font-weight: 500; text-transform: uppercase;
      }
      .crea-article-badge.draft { background: #fef3c7; color: #92400e; }
      .crea-article-badge.published { background: #d1fae5; color: #065f46; }
      .crea-article-delete {
        background: none; border: none; color: #dc2626;
        cursor: pointer; padding: 0.25rem; margin-left: auto;
        opacity: 0; transition: opacity 0.2s;
      }
      .crea-article-card:hover .crea-article-delete { opacity: 1; }
      .crea-article-delete:hover { color: #b91c1c; }
      .crea-article-form {
        position: fixed; top: 3rem; left: 0; right: 0; bottom: 0;
        z-index: 9998; background: white; display: none;
        flex-direction: column; overflow-y: auto;
      }
      .crea-article-form.open { display: flex; }
      .crea-form-header {
        background: #1f2937; color: white; padding: 1rem;
        display: flex; align-items: center; gap: 1rem;
      }
      .crea-form-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
      .crea-form-body { flex: 1; padding: 1.5rem; overflow-y: auto; }
      .crea-form-group { margin-bottom: 1rem; }
      .crea-form-group label {
        display: block; font-size: 0.875rem; font-weight: 500;
        color: #374151; margin-bottom: 0.25rem;
      }
      .crea-form-group input, .crea-form-group select, .crea-form-group textarea {
        width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
        border-radius: 0.375rem; font-size: 0.875rem;
      }
      .crea-form-group input:focus, .crea-form-group select:focus,
      .crea-form-group textarea:focus {
        outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
      }
      .crea-form-group textarea { min-height: 100px; resize: vertical; }
      .crea-form-footer {
        background: #f9fafb; padding: 1rem;
        display: flex; gap: 0.75rem; justify-content: flex-end;
        border-top: 1px solid #e5e7eb;
      }
      .crea-btn-secondary {
        background: white; color: #374151; border: 1px solid #d1d5db;
        padding: 0.5rem 1rem; border-radius: 0.375rem;
        font-size: 0.875rem; cursor: pointer;
      }
      .crea-btn-secondary:hover { background: #f3f4f6; }
      .crea-btn-primary {
        background: #2563eb; color: white; border: none;
        padding: 0.5rem 1rem; border-radius: 0.375rem;
        font-size: 0.875rem; cursor: pointer;
      }
      .crea-btn-primary:hover { background: #1d4ed8; }
      .crea-btn-save-draft {
        background: #f59e0b; color: white; border: none;
        padding: 0.5rem 1rem; border-radius: 0.375rem;
        font-size: 0.875rem; cursor: pointer;
      }
      .crea-btn-save-draft:hover { background: #d97706; }
    `;
    document.head.appendChild(style);
  }

  let currentArticle = null;
  let articles = [];

  async function loadArticles(estado) {
    const url = estado ? `${API_CONFIG.articlesApi}?estado=${estado}` : API_CONFIG.articlesApi;
    const res = await fetch(url);
    const data = await res.json();
    return data.articles || [];
  }

  async function saveArticle(article) {
    const isNew = !article.id;
    const method = isNew ? 'POST' : 'PATCH';
    const res = await fetch(API_CONFIG.articlesApi, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article)
    });
    return res.json();
  }

  async function deleteArticle(id) {
    const res = await fetch(`${API_CONFIG.articlesApi}?id=${id}`, { method: 'DELETE' });
    return res.json();
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Sin fecha';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderArticlesList(filterEstado) {
    const list = document.getElementById('crea-articles-list');
    list.innerHTML = '';
    articles.forEach(art => {
      const card = document.createElement('div');
      card.className = `crea-article-card ${art.estado}`;
      card.innerHTML = `
        <div class="crea-article-header">
          <div style="flex:1;">
            <h4 class="crea-article-title">${art.titulo}</h4>
            <div class="crea-article-meta">
              <span>${art.autor || 'Sin autor'}</span>
              <span>·</span>
              <span>${formatDate(art.fecha_publicacion)}</span>
              <span class="crea-article-badge ${art.estado}">${art.estado}</span>
            </div>
          </div>
          <button class="crea-article-delete" title="Eliminar">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;
      card.onclick = (e) => {
        if (e.target.closest('.crea-article-delete')) {
          if (confirm('¿Eliminar este artículo?')) {
            deleteArticle(art.id).then(() => loadAndRender());
          }
        } else {
          openArticleForm(art);
        }
      };
      list.appendChild(card);
    });
  }

  async function loadAndRender() {
    const filter = document.getElementById('crea-filter-estado')?.value || '';
    articles = await loadArticles(filter === 'all' ? '' : filter);
    renderArticlesList(filter);
  }

  function openArticleForm(article) {
    currentArticle = article || {
      id: null, titulo: '', subtitulo: '', extracto: '',
      contenido_html: '', imagen_destacada: '', imagen_alt: '',
      categoria: 'local', autor: '', estado: 'borrador',
      keywords_seo: [], meta_description: '', fecha_publicacion: null
    };
    const form = document.getElementById('crea-article-form');
    form.classList.add('open');
    form.innerHTML = `
      <div class="crea-form-header">
        <h3>${currentArticle.id ? 'Editar artículo' : 'Nuevo artículo'}</h3>
        <button class="crea-panel-close" onclick="window.creaCloseArticleForm()" style="margin-left:auto;">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="crea-form-body">
        <div class="crea-form-group">
          <label>Título *</label>
          <input type="text" id="crea-art-titulo" value="${currentArticle.titulo || ''}" required>
        </div>
        <div class="crea-form-group">
          <label>Subtítulo</label>
          <input type="text" id="crea-art-subtitulo" value="${currentArticle.subtitulo || ''}">
        </div>
        <div class="crea-form-group">
          <label>Extracto</label>
          <textarea id="crea-art-extracto">${currentArticle.extracto || ''}</textarea>
        </div>
        <div class="crea-form-group">
          <label>Contenido HTML</label>
          <textarea id="crea-art-contenido" style="min-height:200px;">${currentArticle.contenido_html || ''}</textarea>
        </div>
        <div class="crea-form-group">
          <label>Autor</label>
          <input type="text" id="crea-art-autor" value="${currentArticle.autor || ''}">
        </div>
        <div class="crea-form-group">
          <label>Categoría</label>
          <select id="crea-art-categoria">
            <option value="local" ${currentArticle.categoria === 'local' ? 'selected' : ''}>Local</option>
            <option value="economia" ${currentArticle.categoria === 'economia' ? 'selected' : ''}>Economía</option>
            <option value="turismo" ${currentArticle.categoria === 'turismo' ? 'selected' : ''}>Turismo</option>
            <option value="cultura" ${currentArticle.categoria === 'cultura' ? 'selected' : ''}>Cultura</option>
            <option value="deportes" ${currentArticle.categoria === 'deportes' ? 'selected' : ''}>Deportes</option>
          </select>
        </div>
        <div class="crea-form-group">
          <label>URL imagen destacada</label>
          <input type="text" id="crea-art-imagen" value="${currentArticle.imagen_destacada || ''}">
        </div>
        <div class="crea-form-group">
          <label>Alt imagen</label>
          <input type="text" id="crea-art-imagen-alt" value="${currentArticle.imagen_alt || ''}">
        </div>
        <div class="crea-form-group">
          <label>Meta description</label>
          <textarea id="crea-art-meta-desc">${currentArticle.meta_description || ''}</textarea>
        </div>
        <div class="crea-form-group">
          <label>Keywords SEO (separados por coma)</label>
          <input type="text" id="crea-art-keywords" value="${(currentArticle.keywords_seo || []).join(', ')}">
        </div>
        <div class="crea-form-group">
          <label>Estado</label>
          <select id="crea-art-estado">
            <option value="borrador" ${currentArticle.estado === 'borrador' ? 'selected' : ''}>Borrador</option>
            <option value="publicada" ${currentArticle.estado === 'publicada' ? 'selected' : ''}>Publicada</option>
          </select>
        </div>
      </div>
      <div class="crea-form-footer">
        <button class="crea-btn-secondary" onclick="window.creaCloseArticleForm()">Cancelar</button>
        <button class="crea-btn-save-draft" onclick="window.creaSaveArticleDraft()">Guardar borrador</button>
        <button class="crea-btn-primary" onclick="window.creaSaveArticle()">Publicar</button>
      </div>
    `;
    window.creaSaveArticle = async () => {
      document.getElementById('crea-art-estado').value = 'publicada';
      await saveCurrentArticle();
    };
    window.creaSaveArticleDraft = async () => {
      document.getElementById('crea-art-estado').value = 'borrador';
      await saveCurrentArticle();
    };
    window.creaCloseArticleForm = () => {
      form.classList.remove('open');
      currentArticle = null;
    };
  }

  async function saveCurrentArticle() {
    const keywordsStr = document.getElementById('crea-art-keywords').value;
    const article = {
      id: currentArticle.id,
      titulo: document.getElementById('crea-art-titulo').value,
      subtitulo: document.getElementById('crea-art-subtitulo').value,
      extracto: document.getElementById('crea-art-extracto').value,
      contenido_html: document.getElementById('crea-art-contenido').value,
      autor: document.getElementById('crea-art-autor').value,
      categoria: document.getElementById('crea-art-categoria').value,
      imagen_destacada: document.getElementById('crea-art-imagen').value,
      imagen_alt: document.getElementById('crea-art-imagen-alt').value,
      meta_description: document.getElementById('crea-art-meta-desc').value,
      keywords_seo: keywordsStr.split(',').map(k => k.trim()).filter(k => k),
      estado: document.getElementById('crea-art-estado').value,
      fecha_publicacion: currentArticle.fecha_publicacion
    };
    if (article.titulo) {
      await saveArticle(article);
      window.creaCloseArticleForm();
      loadAndRender();
    }
  }

  function openPanel() {
    const panel = document.getElementById('crea-articles-panel');
    panel.classList.add('open');
    loadAndRender();
  }

  function closePanel() {
    const panel = document.getElementById('crea-articles-panel');
    panel.classList.remove('open');
    const form = document.getElementById('crea-article-form');
    if (form) form.classList.remove('open');
  }

  function render() {
    if (!isAuthenticated()) return;

    const panel = document.createElement('div');
    panel.id = 'crea-articles-panel';
    panel.className = 'crea-articles-panel';
    panel.innerHTML = `
      <div class="crea-panel-header">
        <h3>Artículos</h3>
        <button class="crea-panel-close" onclick="window.creaCloseArticlesPanel()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="crea-panel-toolbar">
        <button onclick="window.creaNewArticle()">+ Nuevo artículo</button>
        <select id="crea-filter-estado" class="filter-select" onchange="window.creaLoadArticles()">
          <option value="">Todos</option>
          <option value="publicada">Publicados</option>
          <option value="borrador">Borradores</option>
        </select>
      </div>
      <div id="crea-articles-list" class="crea-articles-list"></div>
    `;
    document.body.appendChild(panel);

    const form = document.createElement('div');
    form.id = 'crea-article-form';
    form.className = 'crea-article-form';
    document.body.appendChild(form);

    window.creaOpenArticlesPanel = openPanel;
    window.creaCloseArticlesPanel = closePanel;
    window.creaNewArticle = () => openArticleForm(null);
    window.creaLoadArticles = loadAndRender;

    const toolbarBtn = document.querySelector('button[onclick*="creaOpenArticles"]');
    if (toolbarBtn) {
      toolbarBtn.onclick = openPanel;
    }
  }

  createStyles();
  if (!isAuthenticated()) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
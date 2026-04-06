(function() {
  const API_CONFIG = {
    contentApi: '/api/content/index.php',
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
      .crea-seo-panel {
        position: fixed; top: 3rem; left: 0; right: 0; bottom: 0;
        z-index: 9997; background: #f3f4f6; display: none;
        flex-direction: column;
      }
      .crea-seo-panel.open { display: flex; }
      .crea-panel-header {
        background: #1f2937; color: white; padding: 1rem;
        display: flex; align-items: center; gap: 1rem;
      }
      .crea-panel-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
      .crea-panel-close {
        background: none; border: none; color: #d1d5db; cursor: pointer;
        padding: 0.25rem; margin-left: auto; border-radius: 0.25rem;
      }
      .crea-panel-close:hover { background: #374151; color: white; }
      .crea-seo-body {
        flex: 1; overflow-y: auto; padding: 1.5rem;
        max-width: 48rem; margin: 0 auto; width: 100%;
      }
      .crea-seo-section {
        background: white; border-radius: 0.5rem; padding: 1.5rem;
        margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .crea-seo-section h4 {
        font-size: 0.875rem; font-weight: 600; color: #374151;
        margin: 0 0 1rem 0; text-transform: uppercase; letter-spacing: 0.05em;
      }
      .crea-seo-preview {
        background: #f9fafb; border: 1px solid #e5e7eb;
        border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;
      }
      .crea-seo-preview-label {
        font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem;
      }
      .crea-seo-preview-title {
        font-size: 1.125rem; color: #1a56db; margin: 0 0 0.25rem 0;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .crea-seo-preview-url {
        font-size: 0.75rem; color: #059669; margin: 0 0 0.25rem 0;
      }
      .crea-seo-preview-desc {
        font-size: 0.875rem; color: #6b7280; margin: 0;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .crea-form-group { margin-bottom: 1rem; }
      .crea-form-group:last-child { margin-bottom: 0; }
      .crea-form-group label {
        display: block; font-size: 0.875rem; font-weight: 500;
        color: #374151; margin-bottom: 0.25rem;
      }
      .crea-form-group input, .crea-form-group textarea {
        width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
        border-radius: 0.375rem; font-size: 0.875rem;
      }
      .crea-form-group input:focus, .crea-form-group textarea:focus {
        outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
      }
      .crea-form-group textarea { min-height: 60px; resize: vertical; }
      .crea-form-group .char-count {
        font-size: 0.75rem; color: #9ca3af; text-align: right; margin-top: 0.25rem;
      }
      .crea-form-group .char-count.warning { color: #f59e0b; }
      .crea-form-group .char-count.danger { color: #dc2626; }
      .crea-seo-footer {
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
      .crea-seo-image-preview {
        margin-top: 0.5rem; border: 1px dashed #d1d5db; border-radius: 0.375rem;
        padding: 0.5rem; text-align: center;
      }
      .crea-seo-image-preview img {
        max-width: 100%; max-height: 120px; object-fit: contain;
      }
      .crea-seo-image-preview .placeholder {
        color: #9ca3af; font-size: 0.875rem; padding: 1rem;
      }
      .crea-twitter-preview {
        margin-top: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;
        overflow: hidden;
      }
      .crea-twitter-preview-header {
        background: #f3f4f6; padding: 0.5rem 1rem;
        font-size: 0.75rem; color: #6b7280;
      }
      .crea-twitter-preview-content {
        padding: 1rem; display: flex; gap: 0.75rem;
      }
      .crea-twitter-preview-content .img-placeholder {
        width: 100px; height: 100px; background: #e5e7eb;
        flex-shrink: 0; border-radius: 0.25rem;
      }
      .crea-twitter-preview-content .text-placeholder {
        flex: 1;
      }
      .crea-twitter-preview-content .site-name {
        font-size: 0.75rem; color: #6b7280;
      }
      .crea-twitter-preview-content .title {
        font-size: 0.875rem; font-weight: 600; color: #111; margin: 0.25rem 0;
      }
      .crea-twitter-preview-content .desc {
        font-size: 0.75rem; color: #6b7280; margin: 0;
      }
    `;
    document.head.appendChild(style);
  }

  let currentPageId = 'home';
  let currentMeta = {
    titulo: '',
    descripcion: '',
    imagen_og: '',
    twitter_card: 'summary_large_image',
    keywords: []
  };

  async function loadMeta() {
    const pageId = document.body.dataset.pageId || 'home';
    currentPageId = pageId;
    try {
      const res = await fetch(`${API_CONFIG.contentApi}?id=${pageId}`);
      if (res.ok) {
        const data = await res.json();
        currentMeta = {
          titulo: data.meta?.titulo || '',
          descripcion: data.meta?.descripcion || '',
          imagen_og: data.meta?.imagen_og || '',
          twitter_card: data.meta?.twitter_card || 'summary_large_image',
          keywords: data.meta?.keywords || []
        };
      }
    } catch (err) {
      console.error('Error loading meta:', err);
    }
  }

  async function saveMeta() {
    try {
      const res = await fetch(`${API_CONFIG.contentApi}?id=${currentPageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta: {
            titulo: document.getElementById('crea-seo-titulo').value,
            descripcion: document.getElementById('crea-seo-descripcion').value,
            imagen_og: document.getElementById('crea-seo-og-image').value,
            twitter_card: document.getElementById('crea-seo-twitter-card').value,
            keywords: document.getElementById('crea-seo-keywords').value
              .split(',').map(k => k.trim()).filter(k => k)
          },
          estado: 'publicada'
        })
      });
      if (res.ok) {
        showNotification('Meta SEO guardada');
        renderPreview();
      }
    } catch (err) {
      showNotification('Error al guardar', 'error');
    }
  }

  function showNotification(message, type = 'success') {
    const existing = document.getElementById('crea-notification');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.id = 'crea-notification';
    notif.textContent = message;
    notif.style.cssText = `
      position: fixed; bottom: 5rem; right: 1rem; z-index: 10001;
      background: ${type === 'error' ? '#dc2626' : '#059669'};
      color: white; padding: 0.75rem 1rem; border-radius: 0.5rem;
      font-size: 0.875rem;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  function charCountClass(text, limit, warnLimit) {
    const len = text.length;
    if (len > limit) return 'danger';
    if (len > warnLimit) return 'warning';
    return '';
  }

  function renderPreview() {
    const titulo = document.getElementById('crea-seo-titulo')?.value || currentMeta.titulo || '';
    const descripcion = document.getElementById('crea-seo-descripcion')?.value || currentMeta.descripcion || '';
    const ogImage = document.getElementById('crea-seo-og-image')?.value || currentMeta.imagen_og || '';
    const twitterCard = document.getElementById('crea-seo-twitter-card')?.value || currentMeta.twitter_card || 'summary_large_image';

    const previewTitle = document.getElementById('crea-preview-title');
    const previewDesc = document.getElementById('crea-preview-desc');
    const previewImg = document.getElementById('crea-preview-og-img');
    const twitterPreview = document.getElementById('crea-twitter-preview-content');

    if (previewTitle) previewTitle.textContent = titulo || 'Título de la página';
    if (previewDesc) previewDesc.textContent = descripcion || 'Descripción de la página...';

    if (previewImg) {
      if (ogImage) {
        previewImg.innerHTML = `<img src="${ogImage}" alt="OG Image">`;
      } else {
        previewImg.innerHTML = `<div class="placeholder">Sin imagen</div>`;
      }
    }

    if (twitterPreview) {
      if (twitterCard === 'summary_large_image' && ogImage) {
        twitterPreview.innerHTML = `
          <div class="img-placeholder" style="background-image:url(${ogImage});background-size:cover;"></div>
          <div class="text-placeholder">
            <div class="site-name">crea-contenidos.com</div>
            <div class="title">${titulo}</div>
            <div class="desc">${descripcion}</div>
          </div>
        `;
      } else {
        twitterPreview.innerHTML = `
          <div class="text-placeholder">
            <div class="site-name">crea-contenidos.com</div>
            <div class="title">${titulo}</div>
            <div class="desc">${descripcion}</div>
          </div>
        `;
      }
    }
  }

  function openPanel() {
    const panel = document.getElementById('crea-seo-panel');
    panel.classList.add('open');
    loadAndRender();
  }

  function closePanel() {
    const panel = document.getElementById('crea-seo-panel');
    panel.classList.remove('open');
  }

  async function loadAndRender() {
    await loadMeta();
    const panel = document.getElementById('crea-seo-panel');
    panel.innerHTML = `
      <div class="crea-panel-header">
        <h3>SEO — ${currentPageId}</h3>
        <button class="crea-panel-close" onclick="window.creaCloseSeoPanel()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="crea-seo-body">
        <div class="crea-seo-preview">
          <div class="crea-seo-preview-label">Vista previa en Google</div>
          <div class="crea-seo-preview-title" id="crea-preview-title">${currentMeta.titulo}</div>
          <div class="crea-seo-preview-url">crea-contenidos.com/${currentPageId}</div>
          <div class="crea-seo-preview-desc" id="crea-preview-desc">${currentMeta.descripcion}</div>
        </div>

        <div class="crea-seo-section">
          <h4>Título y Descripción</h4>
          <div class="crea-form-group">
            <label>Meta título <span style="color:#dc2626;">*</span></label>
            <input type="text" id="crea-seo-titulo" value="${currentMeta.titulo}" maxlength="60" placeholder="Título para buscadores (máx 60 caracteres)">
            <div class="char-count ${charCountClass(currentMeta.titulo, 60, 50)}" id="crea-titulo-count">${currentMeta.titulo.length}/60</div>
          </div>
          <div class="crea-form-group">
            <label>Meta descripción</label>
            <textarea id="crea-seo-descripcion" maxlength="160" placeholder="Descripción para buscadores (máx 160 caracteres)">${currentMeta.descripcion}</textarea>
            <div class="char-count ${charCountClass(currentMeta.descripcion, 160, 140)}" id="crea-desc-count">${currentMeta.descripcion.length}/160</div>
          </div>
        </div>

        <div class="crea-seo-section">
          <h4>Open Graph (Facebook)</h4>
          <div class="crea-seo-preview" style="background:#fafafa;">
            <div class="crea-seo-preview-label">Imagen para redes sociales</div>
            <div id="crea-preview-og-img" class="crea-seo-image-preview">
              ${currentMeta.imagen_og
                ? `<img src="${currentMeta.imagen_og}" alt="OG Image">`
                : `<div class="placeholder">Sin imagen OG</div>`}
            </div>
          </div>
          <div class="crea-form-group">
            <label>OG Image URL</label>
            <input type="text" id="crea-seo-og-image" value="${currentMeta.imagen_og}" placeholder="https://crea-contenidos.com/assets/img/og-image.jpg">
          </div>
        </div>

        <div class="crea-seo-section">
          <h4>Twitter Card</h4>
          <div class="crea-twitter-preview">
            <div class="crea-twitter-preview-header">Vista previa de Twitter</div>
            <div id="crea-twitter-preview-content" class="crea-twitter-preview-content"></div>
          </div>
          <div class="crea-form-group" style="margin-top:1rem;">
            <label>Tipo de tarjeta</label>
            <select id="crea-seo-twitter-card">
              <option value="summary" ${currentMeta.twitter_card === 'summary' ? 'selected' : ''}>Summary</option>
              <option value="summary_large_image" ${currentMeta.twitter_card === 'summary_large_image' ? 'selected' : ''}>Summary Large Image</option>
            </select>
          </div>
        </div>

        <div class="crea-seo-section">
          <h4>Keywords SEO</h4>
          <div class="crea-form-group">
            <label>Keywords (separados por coma)</label>
            <textarea id="crea-seo-keywords" placeholder="perote, noticias, veracruz, cultura">${(currentMeta.keywords || []).join(', ')}</textarea>
          </div>
        </div>
      </div>
      <div class="crea-seo-footer">
        <button class="crea-btn-secondary" onclick="window.creaCloseSeoPanel()">Cancelar</button>
        <button class="crea-btn-primary" onclick="window.creaSaveSeo()">Guardar cambios</button>
      </div>
    `;

    renderPreview();

    document.getElementById('crea-seo-titulo').addEventListener('input', (e) => {
      document.getElementById('crea-titulo-count').textContent = `${e.target.value.length}/60`;
      document.getElementById('crea-titulo-count').className = `char-count ${charCountClass(e.target.value, 60, 50)}`;
      renderPreview();
    });
    document.getElementById('crea-seo-descripcion').addEventListener('input', (e) => {
      document.getElementById('crea-desc-count').textContent = `${e.target.value.length}/160`;
      document.getElementById('crea-desc-count').className = `char-count ${charCountClass(e.target.value, 160, 140)}`;
      renderPreview();
    });
    document.getElementById('crea-seo-og-image').addEventListener('input', renderPreview);
    document.getElementById('crea-seo-twitter-card').addEventListener('change', renderPreview);

    window.creaSaveSeo = saveMeta;
    window.creaCloseSeoPanel = closePanel;
  }

  function render() {
    if (!isAuthenticated()) return;

    const panel = document.createElement('div');
    panel.id = 'crea-seo-panel';
    panel.className = 'crea-seo-panel';
    document.body.appendChild(panel);

    window.creaOpenSeoPanel = openPanel;

    const toolbarBtn = document.querySelector('button[onclick*="creaOpenSeo"]');
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
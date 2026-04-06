(() => {
  const COOKIE_NAME = 'crea_editor_session';

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isAuthenticated() {
    const token = getCookie(COOKIE_NAME);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }

  function toEmbedUrl(fbUrl) {
    let url = fbUrl.trim();
    if (!url.endsWith('/')) url += '/';
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&width=560&show_text=false`;
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .crea-fb-edit-wrapper { position: relative; }
      .crea-fb-edit-btn {
        position: absolute; top: 8px; right: 8px; z-index: 10;
        background: #1877f2; color: white; border: none;
        padding: 0.4rem 0.75rem; border-radius: 0.375rem;
        font-size: 0.75rem; font-weight: 600; cursor: pointer;
        opacity: 0.9; transition: opacity 0.2s;
      }
      .crea-fb-edit-btn:hover { opacity: 1; }
      .crea-fb-modal {
        position: fixed; inset: 0; z-index: 10001;
        background: rgba(0,0,0,0.6);
        display: none; align-items: center; justify-content: center;
      }
      .crea-fb-modal.active { display: flex; }
      .crea-fb-modal-content {
        background: white; border-radius: 1rem; padding: 2rem;
        width: 100%; max-width: 36rem; margin: 1rem;
      }
      .crea-fb-modal-content h3 {
        font-size: 1.125rem; font-weight: 600; color: #111;
        margin: 0 0 0.5rem 0;
      }
      .crea-fb-modal-content .hint {
        font-size: 0.8rem; color: #6b7280; margin: 0 0 1.25rem 0;
      }
      .crea-fb-modal-content input[type="text"] {
        width: 100%; padding: 0.6rem 0.75rem;
        border: 1px solid #d1d5db; border-radius: 0.375rem;
        font-size: 0.875rem; box-sizing: border-box;
      }
      .crea-fb-modal-content input:focus {
        outline: none; border-color: #1877f2;
        box-shadow: 0 0 0 2px rgba(24,119,242,0.2);
      }
      .crea-fb-modal-actions {
        display: flex; gap: 0.75rem; justify-content: flex-end;
        margin-top: 1.5rem;
      }
      .crea-fb-btn-cancel {
        background: white; color: #374151; border: 1px solid #d1d5db;
        padding: 0.5rem 1rem; border-radius: 0.375rem;
        font-size: 0.875rem; cursor: pointer;
      }
      .crea-fb-btn-save {
        background: #1877f2; color: white; border: none;
        padding: 0.5rem 1rem; border-radius: 0.375rem;
        font-size: 0.875rem; cursor: pointer;
      }
      .crea-fb-btn-save:hover { background: #0f5cc5; }
    `;
    document.head.appendChild(style);
  }

  let modal;
  let activeBlockId = null;
  let activeIframe = null;

  function openModal(blockId, iframe) {
    activeBlockId = blockId;
    activeIframe = iframe;

    // Extract original FB URL from current embed src
    const rawSrc = iframe.dataset.src || iframe.getAttribute('src') || '';
    let currentUrl = '';
    try {
      const match = rawSrc.match(/href=([^&]+)/);
      if (match) currentUrl = decodeURIComponent(match[1]).replace(/\/$/, '');
    } catch {}

    modal.innerHTML = `
      <div class="crea-fb-modal-content">
        <h3>Cambiar video de Facebook</h3>
        <p class="hint">Pega la URL del video de Facebook<br>Ej: https://www.facebook.com/100079776720617/videos/1254634283431466</p>
        <input type="text" id="crea-fb-url-input" value="${currentUrl}" placeholder="https://www.facebook.com/...">
        <div class="crea-fb-modal-actions">
          <button class="crea-fb-btn-cancel" id="crea-fb-cancel">Cancelar</button>
          <button class="crea-fb-btn-save" id="crea-fb-save">Guardar</button>
        </div>
      </div>
    `;
    modal.classList.add('active');
    document.getElementById('crea-fb-cancel').onclick = () => modal.classList.remove('active');
    document.getElementById('crea-fb-save').onclick = saveVideo;
  }

  function saveVideo() {
    const url = document.getElementById('crea-fb-url-input').value.trim();
    if (!url) return;
    const embedSrc = toEmbedUrl(url);
    activeIframe.dataset.src = embedSrc;
    activeIframe.src = embedSrc;
    modal.classList.remove('active');
    if (window.creaRegisterChange) {
      window.creaRegisterChange(activeBlockId, { fbUrl: url, embedSrc });
    }
  }

  function makeWrapperEditable(wrapper, blockId) {
    wrapper.classList.add('crea-fb-edit-wrapper');
    const btn = document.createElement('button');
    btn.className = 'crea-fb-edit-btn';
    btn.textContent = '▶ Cambiar video';
    wrapper.appendChild(btn);
    const iframe = wrapper.querySelector('iframe');
    if (!iframe) return;
    btn.onclick = () => openModal(blockId, iframe);
  }

  function init() {
    if (!isAuthenticated()) return;

    createStyles();

    modal = document.createElement('div');
    modal.className = 'crea-fb-modal';
    document.body.appendChild(modal);

    // Explicit [data-editable-fb-embed] attributes
    document.querySelectorAll('[data-editable-fb-embed]').forEach(wrapper => {
      makeWrapperEditable(wrapper, wrapper.dataset.editableFbEmbed);
    });

    // Auto-handle .fb-video-wrapper elements without the attribute
    let autoIdx = 0;
    document.querySelectorAll('.fb-video-wrapper:not([data-editable-fb-embed])').forEach(wrapper => {
      makeWrapperEditable(wrapper, `auto-fb-video-${autoIdx++}`);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

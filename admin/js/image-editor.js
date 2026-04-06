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
      .crea-editable-image {
        position: relative;
        cursor: pointer;
        transition: outline 0.2s;
        outline: 2px solid transparent;
        outline-offset: 2px;
      }
      .crea-editable-image:hover {
        outline-color: rgba(59, 130, 246, 0.5);
      }
      .crea-editable-image.editing {
        outline-color: #3b82f6;
      }
      .crea-editable-image .image-overlay {
        position: absolute; inset: 0;
        background: rgba(59, 130, 246, 0.1);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.2s;
        pointer-events: none;
      }
      .crea-editable-image:hover .image-overlay { opacity: 1; }
      .crea-editable-image .edit-icon {
        background: #2563eb; color: white; padding: 0.5rem;
        border-radius: 50%; font-size: 0.875rem;
      }
      .crea-image-modal {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.6); display: none;
        align-items: center; justify-content: center;
      }
      .crea-image-modal.active { display: flex; }
      .crea-image-modal-content {
        background: white; border-radius: 1rem; padding: 2rem;
        width: 100%; max-width: 32rem; margin: 1rem;
      }
      .crea-image-modal-content h3 {
        font-size: 1.125rem; font-weight: 600; color: #111;
        margin: 0 0 1.5rem 0;
      }
      .crea-image-preview-modal {
        width: 100%; aspect-ratio: 16/9;
        background: #f3f4f6; border-radius: 0.5rem;
        margin-bottom: 1rem; overflow: hidden;
        display: flex; align-items: center; justify-content: center;
      }
      .crea-image-preview-modal img {
        max-width: 100%; max-height: 100%; object-fit: contain;
      }
      .crea-image-preview-modal .placeholder {
        color: #9ca3af; font-size: 0.875rem;
      }
      .crea-form-group { margin-bottom: 1rem; }
      .crea-form-group label {
        display: block; font-size: 0.875rem; font-weight: 500;
        color: #374151; margin-bottom: 0.25rem;
      }
      .crea-form-group input[type="text"] {
        width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
        border-radius: 0.375rem; font-size: 0.875rem;
      }
      .crea-form-group input[type="text"]:focus {
        outline: none; border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
      }
      .crea-image-modal-actions {
        display: flex; gap: 0.75rem; justify-content: flex-end;
        margin-top: 1.5rem;
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
      .crea-image-upload-hint {
        font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;
      }
    `;
    document.head.appendChild(style);
  }

  let currentImageBlock = null;
  let currentSrc = '';
  let currentAlt = '';

  function openModal(blockId, src, alt) {
    currentImageBlock = blockId;
    currentSrc = src;
    currentAlt = alt;
    const modal = document.getElementById('crea-image-modal');
    modal.classList.add('active');
    modal.innerHTML = `
      <div class="crea-image-modal-content">
        <h3>Editar imagen</h3>
        <div class="crea-image-preview-modal" id="crea-img-preview">
          ${src ? `<img src="${src}" alt="${alt}">` : `<div class="placeholder">Sin imagen</div>`}
        </div>
        <div class="crea-form-group">
          <label>URL de la imagen</label>
          <input type="text" id="crea-img-src" value="${src}" placeholder="https://...">
        </div>
        <div class="crea-form-group">
          <label>Texto alternativo (alt)</label>
          <input type="text" id="crea-img-alt" value="${alt}" placeholder="Descripción de la imagen">
        </div>
        <p class="crea-image-upload-hint">Sube la imagen a /assets/img/ y usa la URL relativa o absoluta.</p>
        <div class="crea-image-modal-actions">
          <button class="crea-btn-secondary" onclick="window.creaCloseImageModal()">Cancelar</button>
          <button class="crea-btn-primary" onclick="window.creaSaveImage()">Guardar</button>
        </div>
      </div>
    `;

    document.getElementById('crea-img-src').addEventListener('input', (e) => {
      const preview = document.getElementById('crea-img-preview');
      if (e.target.value) {
        preview.innerHTML = `<img src="${e.target.value}" alt="${document.getElementById('crea-img-alt').value}">`;
      } else {
        preview.innerHTML = `<div class="placeholder">Sin imagen</div>`;
      }
    });

    window.creaSaveImage = () => {
      const newSrc = document.getElementById('crea-img-src').value;
      const newAlt = document.getElementById('crea-img-alt').value;
      applyImageChange(currentImageBlock, newSrc, newAlt);
      window.creaCloseImageModal();
    };
    window.creaCloseImageModal = () => {
      modal.classList.remove('active');
    };
  }

  function applyImageChange(blockId, src, alt) {
    const img = document.querySelector(`img[data-editable-image="${blockId}"]`);
    if (img) {
      img.src = src;
      img.alt = alt;
      if (window.creaRegisterChange) {
        window.creaRegisterChange(blockId, { src, alt });
      }
    }
  }

  function makeEditable(img, blockId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'crea-editable-image';
    wrapper.dataset.blockId = blockId;

    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    overlay.innerHTML = `<div class="edit-icon">✏️</div>`;

    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(overlay);
    wrapper.appendChild(img);

    wrapper.onclick = () => {
      openModal(blockId, img.src, img.alt);
    };
  }

  async function initEditableImages() {
    if (!isAuthenticated()) return;

    const images = document.querySelectorAll('img[data-editable-image]');
    images.forEach(img => {
      const blockId = img.dataset.editableImage;
      makeEditable(img, blockId);
    });
  }

  function renderViewMode() {
    const images = document.querySelectorAll('img[data-editable-image]');
    images.forEach(img => {
      img.style.cursor = 'default';
    });
  }

  function render() {
    if (!isAuthenticated()) {
      renderViewMode();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'crea-image-modal';
    modal.className = 'crea-image-modal';
    document.body.appendChild(modal);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEditableImages);
    } else {
      initEditableImages();
    }
  }

  createStyles();
  if (!isAuthenticated()) {
    renderViewMode();
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
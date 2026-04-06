(() => {
  const CKEDITOR_CONFIG = {
    scriptUrl: 'https://cdn.ckeditor.com/ckeditor5/41.0.0/classic/ckeditor.js'
  };

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isAuthenticated() {
    const token = getCookie('crea_editor_session');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .crea-editable-block {
        position: relative;
        border: 2px solid transparent;
        border-radius: 0.5rem;
        transition: border-color 0.2s;
        cursor: text;
      }
      .crea-editable-block:hover {
        border-color: rgba(59, 130, 246, 0.5);
        border-style: dashed;
      }
      .crea-editable-block.cke_focus {
        border-color: #3b82f6;
        border-style: solid;
      }
      .crea-editable-block .editable-tooltip {
        position: absolute;
        top: -1.75rem;
        left: 0;
        background: #2563eb;
        color: white;
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
        white-space: nowrap;
      }
      .crea-editable-block:hover .editable-tooltip {
        opacity: 1;
      }
      .crea-view-mode {
        cursor: default;
      }
      .crea-loading-editor {
        display: inline-block;
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid #e5e7eb;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  async function initEditors() {
    if (!isAuthenticated()) return;

    const blocks = document.querySelectorAll('[data-editable-block]');
    if (blocks.length === 0) return;

    if (typeof ClassicEditor === 'undefined') {
      const script = document.createElement('script');
      script.src = CKEDITOR_CONFIG.scriptUrl;
      script.onload = () => initializeBlocks(blocks);
      document.head.appendChild(script);
    } else {
      initializeBlocks(blocks);
    }
  }

  async function initializeBlocks(blocks) {
    for (const block of blocks) {
      const blockId = block.dataset.editableBlock;

      const wrapper = document.createElement('div');
      wrapper.className = 'crea-editable-block';
      wrapper.dataset.blockId = blockId;

      const tooltip = document.createElement('div');
      tooltip.className = 'editable-tooltip';
      tooltip.textContent = 'Haz click para editar';

      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(tooltip);
      wrapper.appendChild(block);

      try {
        const editor = await ClassicEditor.create(block, {
          toolbar: ['heading', '|', 'bold', 'italic', 'bulletedList', 'numberedList', '|', 'undo', 'redo'],
          placeholder: 'Escribe aquí...'
        });

        editor.model.document.on('change:data', () => {
          const content = editor.getData();
          if (window.creaRegisterChange) {
            window.creaRegisterChange(blockId, content);
          }
        });

        editor.on('focus', () => wrapper.classList.add('cke_focus'));
        editor.on('blur', () => wrapper.classList.remove('cke_focus'));
      } catch (err) {
        console.error('Error initializing editor for block:', blockId, err);
      }
    }
  }

  function renderViewMode() {
    const blocks = document.querySelectorAll('[data-editable-block]');
    blocks.forEach(block => {
      block.classList.add('crea-view-mode');
    });
  }

  createStyles();
  if (!isAuthenticated()) {
    renderViewMode();
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEditors);
    } else {
      initEditors();
    }
  }
})();
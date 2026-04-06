(() => {
  const AUTH_CONFIG = {
    loginApi: '/api/auth/login.php',
    logoutApi: '/api/auth/logout.php',
    cookieName: 'crea_editor_session'
  };

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isAuthenticated() {
    const token = getCookie(AUTH_CONFIG.cookieName);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }

  function getUserFromToken() {
    const token = getCookie(AUTH_CONFIG.cookieName);
    if (!token) return null;
    try {
      return JSON.parse(atob(token));
    } catch { return null; }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .crea-login-btn {
        position: fixed; bottom: 1rem; right: 1rem; z-index: 9999;
        background: #1f2937; color: white; padding: 0.5rem 1rem;
        border-radius: 9999px; font-size: 0.875rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer;
        border: none; display: flex; align-items: center; gap: 0.5rem;
        transition: background 0.2s;
      }
      .crea-login-btn:hover { background: #374151; }
      .crea-editor-indicator {
        position: fixed; bottom: 1rem; right: 1rem; z-index: 9999;
        background: #059669; color: white; padding: 0.5rem 1rem;
        border-radius: 9999px; font-size: 0.875rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex; align-items: center; gap: 0.5rem;
      }
      .crea-editor-indicator .pulse {
        width: 0.5rem; height: 0.5rem; background: #86efac;
        border-radius: 50%; animation: pulse 2s infinite;
      }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .crea-login-modal {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.6); display: none;
        align-items: center; justify-content: center;
      }
      .crea-login-modal.active { display: flex; }
      .crea-login-modal-content {
        background: white; border-radius: 1rem; padding: 2rem;
        width: 100%; max-width: 24rem; margin: 1rem;
      }
      .crea-login-modal h2 {
        font-size: 1.5rem; font-weight: 700; color: #111;
        text-align: center; margin-bottom: 0.25rem;
      }
      .crea-login-modal p {
        text-align: center; color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem;
      }
      .crea-login-form { display: flex; flex-direction: column; gap: 1rem; }
      .crea-login-form label {
        display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;
      }
      .crea-login-form input {
        width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
        border-radius: 0.5rem; font-size: 0.875rem;
      }
      .crea-login-form input:focus {
        outline: none; box-shadow: 0 0 0 2px #3b82f6;
      }
      .crea-login-error {
        font-size: 0.875rem; color: #dc2626; background: #fef2f2;
        padding: 0.5rem 0.75rem; border-radius: 0.5rem;
      }
      .crea-login-submit {
        background: #2563eb; color: white; padding: 0.5rem;
        border-radius: 0.5rem; font-weight: 500; border: none; cursor: pointer;
      }
      .crea-login-submit:hover { background: #1d4ed8; }
      .crea-login-cancel {
        margin-top: 1rem; width: 100%; color: #9ca3af; font-size: 0.875rem;
        background: none; border: none; cursor: pointer;
      }
      .crea-login-cancel:hover { color: #4b5563; }
    `;
    document.head.appendChild(style);
  }

  function showModal() {
    const modal = document.getElementById('crea-login-modal');
    if (modal) modal.classList.add('active');
  }

  function hideModal() {
    const modal = document.getElementById('crea-login-modal');
    if (modal) modal.classList.remove('active');
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('crea-login-email').value;
    const password = document.getElementById('crea-login-password').value;
    const errorEl = document.getElementById('crea-login-error');
    const btn = document.getElementById('crea-login-submit');

    btn.textContent = 'Verificando...';
    btn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const res = await fetch(AUTH_CONFIG.loginApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'Error al iniciar sesión';
        errorEl.style.display = 'block';
        btn.textContent = 'Ingresar al editor';
        btn.disabled = false;
        return;
      }

      hideModal();
      window.location.reload();
    } catch (err) {
      errorEl.textContent = 'Error de conexión';
      errorEl.style.display = 'block';
      btn.textContent = 'Ingresar al editor';
      btn.disabled = false;
    }
  }

  async function handleLogout() {
    await fetch(AUTH_CONFIG.logoutApi, { method: 'POST' });
    window.location.reload();
  }

  function render() {
    const user = getUserFromToken();

    if (isAuthenticated() && user) {
      const indicator = document.createElement('div');
      indicator.className = 'crea-editor-indicator';
      indicator.innerHTML = `
        <span class="pulse"></span>
        Modo Editor — ${user.nombre}
        <button onclick="window.creaLogout()" style="background:none;border:none;color:#86efac;cursor:pointer;margin-left:0.5rem;text-decoration:underline;">
          Salir
        </button>
      `;
      document.body.appendChild(indicator);
      window.creaLogout = handleLogout;
    } else {
      const btn = document.createElement('button');
      btn.className = 'crea-login-btn';
      btn.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Iniciar sesión
      `;
      btn.onclick = showModal;
      document.body.appendChild(btn);
    }

    const modal = document.createElement('div');
    modal.id = 'crea-login-modal';
    modal.className = 'crea-login-modal';
    modal.innerHTML = `
      <div class="crea-login-modal-content">
        <h2>CREA</h2>
        <p>Acceso editorial</p>
        <form class="crea-login-form" id="crea-login-form">
          <div>
            <label>Correo electrónico</label>
            <input type="email" id="crea-login-email" placeholder="editor@creacontenidos.com" required>
          </div>
          <div>
            <label>Contraseña</label>
            <input type="password" id="crea-login-password" required>
          </div>
          <div id="crea-login-error" class="crea-login-error" style="display:none;"></div>
          <button type="submit" id="crea-login-submit" class="crea-login-submit">Ingresar al editor</button>
        </form>
        <button class="crea-login-cancel" onclick="window.creaHideLoginModal()">Cancelar</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('crea-login-form').onsubmit = handleLogin;
    window.creaHideLoginModal = hideModal;
  }

  createStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
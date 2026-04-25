/**
 * CREA Session Guard
 * Checks session validity periodically and redirects to login if expired.
 */
(() => {
  const COOKIE_NAME = 'crea_editor_session';
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isSessionValid() {
    const token = getCookie(COOKIE_NAME);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  }

  function showExpiredModal() {
    if (document.getElementById('crea-session-expired')) return;

    const overlay = document.createElement('div');
    overlay.id = 'crea-session-expired';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:99999;
      background:rgba(0,0,0,0.6); display:flex;
      align-items:center; justify-content:center;
    `;
    overlay.innerHTML = `
      <div style="background:white; border-radius:1rem; padding:2rem; max-width:360px; text-align:center;">
        <div style="font-size:2.5rem; margin-bottom:0.75rem;">🔒</div>
        <h2 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem; color:#111;">Sesión expirada</h2>
        <p style="color:#6b7280; font-size:0.875rem; margin-bottom:1.5rem;">Tu sesión ha expirado. Inicia sesión de nuevo para continuar editando.</p>
        <button onclick="window.location.href='/admin/login.html'" style="
          background:#2563eb; color:white; border:none; padding:0.625rem 1.5rem;
          border-radius:0.5rem; font-size:0.875rem; font-weight:500; cursor:pointer;
        ">Iniciar sesión</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function checkSession() {
    if (!isSessionValid()) {
      // Only show on admin pages
      if (window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login.html') {
        showExpiredModal();
      }
    }
  }

  // Initial check after 1 second
  setTimeout(checkSession, 1000);

  // Periodic check
  setInterval(checkSession, CHECK_INTERVAL);
})();

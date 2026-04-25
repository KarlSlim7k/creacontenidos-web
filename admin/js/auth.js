(() => {
  const API_CONFIG = {
    loginApi: '/api/auth/login.php',
    logoutApi: '/api/auth/logout.php',
    cookieName: 'crea_editor_session'
  };

  const HARDCODED_USERS = [
    {
      id: 'editor-001',
      nombre: 'Editor CREA',
      email: 'editor@creacontenidos.com',
      password: 'password123',
      rol: 'director_editorial'
    }
  ];

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
    } catch {
      return false;
    }
  }

  function getUserFromToken() {
    const token = getCookie(API_CONFIG.cookieName);
    if (!token) return null;
    try {
      return JSON.parse(atob(token));
    } catch {
      return null;
    }
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  }

  function getAuthHeader() {
    return { 'Authorization': 'Bearer ' + getCookie(API_CONFIG.cookieName) };
  }

  window.CreaAuth = {
    isAuthenticated,
    getUserFromToken,
    requireAuth,
    getAuthHeader,
    getCookie
  };

  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorEl = document.getElementById('login-error');
      const btn = document.getElementById('login-submit');

      btn.textContent = 'Verificando...';
      btn.disabled = true;
      errorEl.style.display = 'none';

      try {
        const res = await fetch(API_CONFIG.loginApi, {
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

        window.location.href = '/admin/dashboard.html';
      } catch (err) {
        errorEl.textContent = 'Error de conexión';
        errorEl.style.display = 'block';
        btn.textContent = 'Ingresar al editor';
        btn.disabled = false;
      }
    });
  }
})();
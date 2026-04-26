/**
 * CREA CRM — Login Form Handler
 * Solo para /admin/login.html — el auth centralizado está en session-guard.js
 */
(() => {
  const API_CONFIG = {
    loginApi: '/api/auth/login.php'
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

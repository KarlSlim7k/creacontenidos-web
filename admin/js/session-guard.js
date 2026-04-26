/**
 * CREA CRM — Auth Centralizado + Utilidades
 * Uso: <script src="/admin/js/session-guard.js"></script>
 */
(() => {
  const COOKIE_NAME = 'crea_editor_session';
  const CHECK_INTERVAL = 5 * 60 * 1000;

  // ─── Auth ───
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function base64UrlToBase64(str) {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4;
    if (pad) s += '='.repeat(4 - pad);
    return s;
  }

  function decodeTokenPayload(token) {
    if (!token) return null;
    try {
      if (token.includes('.')) {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(atob(base64UrlToBase64(parts[1])));
      }
      return JSON.parse(atob(token));
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    const token = getCookie(COOKIE_NAME);
    if (!token) return false;
    const payload = decodeTokenPayload(token);
    return !!payload && payload.exp > Math.floor(Date.now() / 1000);
  }

  function getUserFromToken() {
    const token = getCookie(COOKIE_NAME);
    if (!token) return null;
    return decodeTokenPayload(token);
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  }

  function getAuthHeaders() {
    return { 'Authorization': 'Bearer ' + getCookie(COOKIE_NAME) };
  }

  async function apiFetch(url, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json', ...getAuthHeaders() };
    const res = await fetch(url, { ...options, headers: { ...defaultHeaders, ...options.headers } });
    if (res.status === 401) {
      document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/admin/login.html';
      throw new Error('Session expired');
    }
    return res;
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout.php', { method: 'POST' }); } catch {}
    document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/admin/login.html';
  }

  // ─── Session Guard (auto-check) ───
  function showExpiredModal() {
    if (document.getElementById('crea-session-expired')) return;
    const overlay = document.createElement('div');
    overlay.id = 'crea-session-expired';
    overlay.className = 'session-expired-overlay';
    overlay.innerHTML = `
      <div class="session-expired-modal">
        <div class="session-expired-modal__icon">🔒</div>
        <h2 class="session-expired-modal__title">Sesión expirada</h2>
        <p class="session-expired-modal__text">Tu sesión ha expirado. Inicia sesión de nuevo para continuar.</p>
        <button class="btn btn--primary" onclick="window.location.href='/admin/login.html'">Iniciar sesión</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function checkSession() {
    if (!isAuthenticated() && window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login.html') {
      showExpiredModal();
    }
  }

  setTimeout(checkSession, 2000);
  setInterval(checkSession, CHECK_INTERVAL);

  // ─── Toast Notifications ───
  function showToast(message, type = 'ok') {
    let container = document.getElementById('crm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'crm-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--show'));
    setTimeout(() => {
      toast.classList.remove('toast--show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── Loading Spinner ───
  function showSpinner(target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.classList.add('loading');
    el.setAttribute('data-loading', 'true');
  }

  function hideSpinner(target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.classList.remove('loading');
    el.removeAttribute('data-loading');
  }

  // ─── Sidebar Toggle ───
  function initSidebarToggle() {
    const menuBtn = document.getElementById('btn-menu');
    const sidebar = document.getElementById('dash-sidebar');
    const overlay = document.getElementById('dash-overlay');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
        overlay?.classList.toggle('active');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  // ─── User Info in Topbar ───
  function renderUserInfo() {
    const user = getUserFromToken();
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = user.nombre || user.email;
    if (avatarEl) avatarEl.textContent = (user.nombre || user.email || 'E')[0].toUpperCase();
  }

  // ─── Form Validation ───
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[0-9]{10,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  function validateField(input, rules = {}) {
    const value = input.value.trim();
    const errors = [];

    if (rules.required && !value) errors.push('Este campo es obligatorio');
    if (rules.email && value && !validateEmail(value)) errors.push('Email no válido');
    if (rules.phone && value && !validatePhone(value)) errors.push('Teléfono no válido (10-15 dígitos)');
    if (rules.min && value.length < rules.min) errors.push(`Mínimo ${rules.min} caracteres`);
    if (rules.max && value.length > rules.max) errors.push(`Máximo ${rules.max} caracteres`);
    if (rules.pattern && !rules.pattern.test(value)) errors.push(rules.message || 'Formato no válido');

    return { valid: errors.length === 0, errors };
  }

  function showFieldError(input, message) {
    const group = input.closest('.form-group') || input.parentElement;
    let errorEl = group.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      group.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    input.classList.add('field-error-input');
  }

  function clearFieldError(input) {
    const group = input.closest('.form-group') || input.parentElement;
    const errorEl = group.querySelector('.field-error');
    if (errorEl) { errorEl.style.display = 'none'; }
    input.classList.remove('field-error-input');
  }

  // ─── CSV Export ───
  function exportToCSV(data, filename, headers = null) {
    if (!data || data.length === 0) {
      showToast('No hay datos para exportar', 'err');
      return;
    }
    const cols = headers || Object.keys(data[0]);
    const csvContent = [
      cols.map(c => `"${c}"`).join(','),
      ...data.map(row => cols.map(c => `"${(row[c] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archivo CSV descargado', 'ok');
  }

  // ─── Pagination Helper ───
  function createPagination(container, totalItems, currentPage, pageSize, onPageChange) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '<div class="pagination">';
    html += `<button class="pagination__btn ${currentPage === 1 ? 'disabled' : ''}" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">← Anterior</button>`;

    const range = 2;
    let start = Math.max(1, currentPage - range);
    let end = Math.min(totalPages, currentPage + range);

    if (start > 1) {
      html += `<button class="pagination__btn" data-page="1">1</button>`;
      if (start > 2) html += `<span class="pagination__ellipsis">...</span>`;
    }

    for (let i = start; i <= end; i++) {
      html += `<button class="pagination__btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += `<span class="pagination__ellipsis">...</span>`;
      html += `<button class="pagination__btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="pagination__btn ${currentPage === totalPages ? 'disabled' : ''}" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Siguiente →</button>`;
    html += `<span class="pagination__info">${totalItems} registros</span>`;
    html += '</div>';

    container.innerHTML = html;
    container.querySelectorAll('.pagination__btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page)));
    });
  }

  // ─── Keyboard Shortcuts ───
  function initKeyboardShortcuts(shortcuts = {}) {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const key = e.key.toLowerCase();
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    });
  }

  // ─── Common Utilities ───
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // ─── Export API ───
  window.CreaCRM = {
    auth: { getCookie, isAuthenticated, getUserFromToken, requireAuth, getAuthHeaders, handleLogout },
    api: { apiFetch },
    ui: { showToast, showSpinner, hideSpinner, initSidebarToggle, renderUserInfo, initKeyboardShortcuts, escapeHtml, formatDate },
    validation: { validateEmail, validatePhone, validateField, showFieldError, clearFieldError },
    export: { exportToCSV },
    pagination: { createPagination }
  };

  // Auto-init sidebar toggle on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSidebarToggle();
      renderUserInfo();
    });
  } else {
    initSidebarToggle();
    renderUserInfo();
  }
})();

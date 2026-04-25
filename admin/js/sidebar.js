/**
 * CREA CRM — Sidebar Unificado
 * Inyecta la navegación completa en todas las páginas admin.
 * Uso: <script src="/admin/js/sidebar.js"></script>
 *
 * El script detecta automáticamente la página activa por pathname.
 */
(() => {
  const NAV_ITEMS = [
    { section: 'Principal', items: [
      { href: '/admin/dashboard.html', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/admin/articulos.html', label: 'Artículos', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
      { href: '/admin/paginas.html', label: 'Páginas', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    ]},
    { section: 'Editorial', items: [
      { href: '/admin/editorial.html', label: 'Propuestas IA', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
      { href: '/admin/calendario.html', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { href: '/admin/radar.html', label: 'Radar de Temas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ]},
    { section: 'Programas', items: [
      { href: '/admin/tercer-tiempo.html', label: 'Tercer Tiempo', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
      { href: '/admin/newsletter.html', label: 'Newsletter', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    ]},
    { section: 'Comercial', items: [
      { href: '/admin/comercial.html', label: 'Paquetes / Comercial', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/admin/clientes.html', label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    ]},
  ];

  function buildSvg(d) {
    return `<svg viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
  }

  function renderSidebar() {
    const container = document.getElementById('dash-sidebar');
    if (!container) return;

    const currentPath = window.location.pathname;

    let navHtml = '';
    NAV_ITEMS.forEach(group => {
      navHtml += `<div class="dash-nav__section-title">${group.section}</div>`;
      group.items.forEach(item => {
        const isActive = currentPath === item.href || currentPath.endsWith(item.href);
        navHtml += `<a href="${item.href}" class="dash-nav__link${isActive ? ' active' : ''}">${buildSvg(item.icon)} ${item.label}</a>`;
      });
    });

    container.innerHTML = `
      <div class="dash-sidebar__header">
        <img src="/assets/img/public/logo-crea.png" alt="CREA Contenidos" class="dash-sidebar__logo">
        <span class="dash-sidebar__badge">Panel Editorial</span>
      </div>
      <nav class="dash-sidebar__nav">${navHtml}</nav>
      <div class="dash-sidebar__footer">
        <a href="/" class="dash-sidebar__site-link" target="_blank">
          <svg viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          Ver sitio público
        </a>
      </div>
    `;
  }

  // Run on DOMContentLoaded or immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidebar);
  } else {
    renderSidebar();
  }
})();

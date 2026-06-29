/* CREA Contenidos — nav.js
 * Header + footer compartidos, inyectados via [data-include].
 * Maneja nav mobile, sticky header, search bar, aria-current.
 */
(function () {
  'use strict';

  const NAV_ITEMS = [
    { href: '/', label: 'Inicio', id: 'home' },
    { href: '/pages/local.html', label: 'Local', id: 'local' },
    { href: '/pages/deportes.html', label: 'Deportes', id: 'deportes' },
    { href: '/pages/cultura.html', label: 'Cultura', id: 'cultura' },
    { href: '/pages/opinion.html', label: 'Opinión', id: 'opinion' },
    { href: '/pages/comercial.html', label: 'Apoya a CREA', id: 'comercial', cta: true },
    { href: '/pages/tercer-tiempo.html', label: '⚽ Tercer Tiempo', id: 'tercer-tiempo', accent: 'tt' }
  ];

  const SOCIAL_LINKS = [
    { href: '#', label: 'Facebook', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    { href: '#', label: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
    { href: '#', label: 'X / Twitter', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' }
  ];

  function renderHeader(pageId) {
    const socialHtml = SOCIAL_LINKS.map(s =>
      `<a href="${s.href}" aria-label="${s.label}"><svg viewBox="0 0 24 24"><path d="${s.icon}"/></svg></a>`
    ).join('');

    const navHtml = NAV_ITEMS.map(item => {
      const classes = ['nav-principal__enlace'];
      if (item.id === pageId) classes.push('activo');
      const styleAttr = item.accent === 'tt' ? ' style="color:var(--tt-acento);"' : '';
      const ctaAttr = item.cta ? ' data-cta="true"' : '';
      return `<li><a href="${item.href}" class="${classes.join(' ')}"${styleAttr}${ctaAttr}>${item.label}</a></li>`;
    }).join('');

    const isTT = pageId === 'tercer-tiempo';
    const logoBlock = isTT ? `
        <div>
          <div class="header__logo-grupo">
            <a href="/" class="header__logo" aria-label="Inicio CREA Contenidos">
              <img src="/assets/img/public/logo-crea.png" alt="CREA Contenidos" class="header__logo-img" width="110" height="65">
            </a>
            <div class="header__logo-div" aria-hidden="true"></div>
            <img src="/assets/img/public/logo-tt.png" alt="Tercer Tiempo" class="header__logo-tt" width="110" height="60">
          </div>
          <p class="header__tagline">El programa deportivo de CREA Contenidos</p>
        </div>` : `
        <div>
          <a href="/" class="header__logo" aria-label="Inicio CREA Contenidos">
            <img src="/assets/img/public/logo-crea.png" alt="CREA Contenidos" class="header__logo-img" width="110" height="65">
          </a>
          <p class="header__tagline">El medio de Perote y su región</p>
        </div>`;

    return `
<div class="barra-utilidad">
  <div class="container">
    <div class="barra-utilidad__izq">
      <span id="fecha-actual"></span>
      <span class="temp-perote">🌤 14°C Perote</span>
      <a href="/pages/newsletter.html" class="newsletter-link">📩 Newsletter</a>
    </div>
    <div class="barra-utilidad__der">
      ${socialHtml}
    </div>
  </div>
</div>

<header class="header-editorial" id="header">
  <div class="container">
    <div class="header__top">
      ${logoBlock}
      <div class="header__actions">
        <button class="search-toggle" id="search-toggle" aria-label="Buscar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <a href="/pages/comercial.html" class="btn-cta">Apoya a CREA</a>
        <button class="hamburger" id="hamburger" aria-label="Menú" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <nav class="nav-principal" aria-label="Navegación principal">
      <ul class="nav-principal__lista" id="nav-lista">
        ${navHtml}
      </ul>
    </nav>
    <div class="search-bar" id="search-bar">
      <input type="search" placeholder="Buscar en CREA Contenidos..." aria-label="Buscar">
    </div>
  </div>
</header>`;
  }

  function renderFooter() {
    return `
<footer class="footer">
  <div class="container">
    <div class="footer__grid">
      <div>
        <a href="/" class="footer__logo"><img src="/assets/img/public/logo-crea.png" alt="CREA Contenidos" class="footer__logo-img"></a>
        <p class="footer__desc">CREA Contenidos es el medio digital de referencia para Perote y la región serrana de Veracruz. Periodismo local, humano, potenciado por inteligencia artificial.</p>
      </div>
      <div>
        <h4 class="footer__titulo-col">Secciones</h4>
        <ul class="footer__lista">
          <li><a href="/pages/seccion.html">Local</a></li>
          <li><a href="/pages/cultura.html">Cultura</a></li>
          <li><a href="/pages/economia.html">Economía</a></li>
          <li><a href="/pages/deportes.html">Deportes</a></li>
          <li><a href="/pages/opinion.html">Opinión</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__titulo-col">CREA</h4>
        <ul class="footer__lista">
          <li><a href="/pages/colaboradores.html">Equipo</a></li>
          <li><a href="/pages/comunidad.html">Comunidad</a></li>
          <li><a href="/pages/comercial.html">Publicidad</a></li>
          <li><a href="/pages/newsletter.html">Newsletter</a></li>
          <li><a href="/admin/login.html">Acceso editorial</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__titulo-col">Contacto</h4>
        <ul class="footer__lista">
          <li><a href="mailto:contacto@crea-contenidos.com">contacto@crea-contenidos.com</a></li>
          <li><a href="/pages/comercial.html">Comercial</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© <span id="anio-actual">2026</span> CREA Contenidos. Todos los derechos reservados.</span>
      <span class="footer__hecho">Hecho en Perote, Veracruz 🇲🇽</span>
    </div>
  </div>
</footer>`;
  }

  function initIncludes() {
    const pageId = document.body.dataset.pageId || '';
    document.querySelectorAll('[data-include="header"]').forEach(el => {
      el.outerHTML = renderHeader(pageId);
    });
    document.querySelectorAll('[data-include="footer"]').forEach(el => {
      el.outerHTML = renderFooter();
    });
  }

  function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const navLista = document.getElementById('nav-lista');
    if (!hamburger || !navLista) return;

    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('is-active');
      navLista.classList.toggle('is-open');
      const expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !expanded);
    });

    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !navLista.contains(e.target)) {
        hamburger.classList.remove('is-active');
        navLista.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        hamburger.classList.remove('is-active');
        navLista.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initStickyHeader() {
    const header = document.querySelector('.header-editorial');
    if (!header) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 80) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }, { passive: true });
  }

  function initSearch() {
    const toggle = document.getElementById('search-toggle');
    const bar = document.getElementById('search-bar');
    if (!toggle || !bar) return;

    toggle.addEventListener('click', function () {
      bar.classList.toggle('is-open');
      if (bar.classList.contains('is-open')) {
        const input = bar.querySelector('input');
        if (input) input.focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') bar.classList.remove('is-open');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initIncludes();
    initMobileNav();
    initStickyHeader();
    initSearch();
  });
})();
/* CREA Contenidos — main.js */
(function () {
  'use strict';

  /* ── Fecha dinámica en barra de utilidad ── */
  function setFechaDinamica() {
    const el = document.getElementById('fecha-actual');
    if (!el) return;
    const ahora = new Date();
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    el.textContent = `${dias[ahora.getDay()]} ${ahora.getDate()} de ${meses[ahora.getMonth()]} de ${ahora.getFullYear()}`;
  }

  /* ── Año dinámico en footer ── */
  function setAnioFooter() {
    const el = document.getElementById('anio-actual');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ── Navegación móvil ── */
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

    // Cerrar al clic fuera
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !navLista.contains(e.target)) {
        hamburger.classList.remove('is-active');
        navLista.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Sticky header compacto ── */
  function initStickyHeader() {
    const header = document.querySelector('.header-editorial');
    if (!header) return;
    let lastScroll = 0;

    window.addEventListener('scroll', function () {
      const currentScroll = window.scrollY;
      if (currentScroll > 80) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  /* ── Barra de búsqueda ── */
  function initSearch() {
    const toggle = document.getElementById('search-toggle');
    const bar = document.getElementById('search-bar');
    if (!toggle || !bar) return;

    toggle.addEventListener('click', function () {
      bar.classList.toggle('is-open');
      if (bar.classList.contains('is-open')) {
        bar.querySelector('input').focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') bar.classList.remove('is-open');
    });
  }

  /* ── IntersectionObserver para animaciones de entrada ── */
  function initRevealAnimations() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(function (el) { observer.observe(el); });
  }

  /* ── Smooth scroll para links ancla ── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ── Inicialización ── */
  document.addEventListener('DOMContentLoaded', function () {
    setFechaDinamica();
    setAnioFooter();
    initMobileNav();
    initStickyHeader();
    initSearch();
    initRevealAnimations();
    initSmoothScroll();
  });
})();

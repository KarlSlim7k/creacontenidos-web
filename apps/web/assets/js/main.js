/* CREA Contenidos — main.js
 * Helpers globales. Nav/footer/sticky/search viven en nav.js.
 */
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
    initRevealAnimations();
    initSmoothScroll();
  });
})();
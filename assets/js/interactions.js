/* CREA Contenidos — interactions.js */
(function () {
  'use strict';

  /* ── Parallax sutil en hero ── */
  function initParallax() {
    const hero = document.querySelector('.hero-editorial__imagen img');
    if (!hero) return;
    window.addEventListener('scroll', function () {
      const scrolled = window.scrollY;
      if (scrolled < 800) {
        hero.style.transform = 'translateY(' + (scrolled * 0.15) + 'px) scale(1.05)';
      }
    }, { passive: true });
  }

  /* ── Contadores animados para métricas ── */
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-counter'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const duration = 1500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = prefix + current.toLocaleString('es-MX') + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  /* ── Hover sobre cards — efecto de inclinación sutil ── */
  function initCardTilt() {
    if (window.matchMedia('(hover: none)').matches) return;
    const cards = document.querySelectorAll('.card-nota, .producto-card, .perfil-card');
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -2;
        const rotateY = ((x - centerX) / centerX) * 2;
        card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ── Progress bar de lectura (artículo) ── */
  function initReadingProgress() {
    const bar = document.getElementById('reading-progress');
    const article = document.querySelector('.articulo-body');
    if (!bar || !article) return;

    window.addEventListener('scroll', function () {
      const articleRect = article.getBoundingClientRect();
      const articleTop = articleRect.top + window.scrollY;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollPos = window.scrollY - articleTop + windowHeight * 0.3;
      const progress = Math.max(0, Math.min(100, (scrollPos / articleHeight) * 100));
      bar.style.width = progress + '%';
    }, { passive: true });
  }

  /* ── Imagen lazy load con fade-in ── */
  function initLazyImages() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(function (img) {
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.4s ease';
      if (img.complete) {
        img.style.opacity = '1';
      } else {
        img.addEventListener('load', function () {
          img.style.opacity = '1';
        });
        img.addEventListener('error', function () {
          img.style.opacity = '1';
          img.alt = 'Imagen no disponible';
        });
      }
    });
  }

  /* ── Formulario: estados visuales ── */
  function initFormInteractions() {
    const inputs = document.querySelectorAll('.form-input, .form-textarea, .form-select');
    inputs.forEach(function (input) {
      input.addEventListener('focus', function () {
        this.closest('.form-grupo')?.classList.add('is-focused');
      });
      input.addEventListener('blur', function () {
        this.closest('.form-grupo')?.classList.remove('is-focused');
        if (this.value) {
          this.closest('.form-grupo')?.classList.add('has-value');
        } else {
          this.closest('.form-grupo')?.classList.remove('has-value');
        }
      });
    });

    // Prevenir envío real de formularios en prototipo
    document.querySelectorAll('form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('[type="submit"], .btn-cta');
        if (btn) {
          var originalText = btn.textContent;
          btn.textContent = '¡Enviado! ✓';
          btn.style.background = '#27AE60';
          setTimeout(function () {
            btn.textContent = originalText;
            btn.style.background = '';
          }, 2500);
        }
      });
    });
  }

  /* ── Inicializar ── */
  document.addEventListener('DOMContentLoaded', function () {
    initParallax();
    initCounters();
    initCardTilt();
    initReadingProgress();
    initLazyImages();
    initFormInteractions();
  });
})();

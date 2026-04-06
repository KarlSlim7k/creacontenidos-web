/* ═══════════════════════════════════════════════════════
   TERCER TIEMPO — tercer-tiempo.js
   CREA Contenidos · Perote, Veracruz
═══════════════════════════════════════════════════════ */

/* 1. ── Contador regresivo a la próxima emisión (Lunes y Viernes 8pm CDMX) ── */
function proximaEmision() {
  const ahora = new Date();
  // Días de emisión: 1=Lunes, 5=Viernes
  const diasEmision = [1, 5];

  let menorDiff = Infinity;

  for (const dia of diasEmision) {
    let diff = (dia - ahora.getDay() + 7) % 7;
    if (diff === 0) {
      // Hoy es día de emisión — revisar si ya pasó la hora (20:00)
      const hoyEmision = new Date(ahora);
      hoyEmision.setHours(20, 0, 0, 0);
      if (ahora >= hoyEmision) {
        diff = 7; // Ya pasó, calcular la siguiente semana
      }
    }
    if (diff < menorDiff) menorDiff = diff;
  }

  const proxEmision = new Date(ahora);
  proxEmision.setDate(ahora.getDate() + menorDiff);
  proxEmision.setHours(20, 0, 0, 0); // 8pm hora CDMX
  return proxEmision;
}

function actualizarContador() {
  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) return;

  const objetivo = proximaEmision();
  const ahora = new Date();
  const diff = objetivo - ahora;

  if (diff <= 0) {
    countdownEl.innerHTML =
      '<span class="live-now">🔴 EN VIVO AHORA</span>';
    return;
  }

  const dias    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const segundos= Math.floor((diff % (1000 * 60)) / 1000);

  const diasEl     = document.getElementById('dias');
  const horasEl    = document.getElementById('horas');
  const minutosEl  = document.getElementById('minutos');
  const segundosEl = document.getElementById('segundos');

  if (diasEl)     diasEl.textContent     = String(dias).padStart(2, '0');
  if (horasEl)    horasEl.textContent    = String(horas).padStart(2, '0');
  if (minutosEl)  minutosEl.textContent  = String(minutos).padStart(2, '0');
  if (segundosEl) segundosEl.textContent = String(segundos).padStart(2, '0');
}

// Iniciar y actualizar cada segundo
actualizarContador();
setInterval(actualizarContador, 1000);


/* 2. ── Lazy loading del embed de Facebook ── */
(function initFbLazyLoad() {
  const fbVideoWrapper = document.querySelector('.fb-video-wrapper');
  if (!fbVideoWrapper) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const iframe = fbVideoWrapper.querySelector('iframe[data-src]');
        if (iframe) {
          iframe.src = iframe.dataset.src;
          iframe.removeAttribute('data-src');
        }
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });

  observer.observe(fbVideoWrapper);
})();


/* 3. ── Compartir episodio ── */
function compartirEpisodio(titulo, url) {
  const texto      = encodeURIComponent(`¡Mira este episodio de Tercer Tiempo en CREA Contenidos: "${titulo}"!`);
  const urlEncoded = encodeURIComponent(url);

  return {
    whatsapp: `https://wa.me/?text=${texto}%20${urlEncoded}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}`,
    twitter:  `https://twitter.com/intent/tweet?text=${texto}&url=${urlEncoded}&hashtags=TercerTiempo,CreaContenidos`
  };
}

// Inicializar botones de compartir con data-attributes
(function initShareBtns() {
  const shareWa = document.querySelectorAll('[data-share-whatsapp]');
  const shareFb = document.querySelectorAll('[data-share-facebook]');

  shareWa.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const titulo = this.dataset.titulo || 'Episodio de Tercer Tiempo';
      const url    = this.dataset.url    || window.location.href;
      const links  = compartirEpisodio(titulo, url);
      window.open(links.whatsapp, '_blank', 'noopener,noreferrer');
    });
  });

  shareFb.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const titulo = this.dataset.titulo || 'Episodio de Tercer Tiempo';
      const url    = this.dataset.url    || window.location.href;
      const links  = compartirEpisodio(titulo, url);
      window.open(links.facebook, '_blank', 'noopener,noreferrer');
    });
  });
})();


/* 4. ── Reveal on scroll (reutiliza clase .reveal de main.css) ── */
(function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealEls.forEach(el => observer.observe(el));
})();


/* 5. ── Hover interactivo en cards de episodio ── */
(function initEpCardInteractions() {
  const cards = document.querySelectorAll('.card-episodio, .widget-ep-principal, .widget-ep-secundario');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.cursor = 'pointer';
    });
  });
})();

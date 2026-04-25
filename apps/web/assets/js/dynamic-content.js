/**
 * CREA Contenidos — Dynamic Content Loader
 * Loads articles from the API and populates the page dynamically.
 * Falls back to static content if API is unavailable.
 */
(() => {
  const API_URL = '/api/articles/crud.php';

  async function loadPublishedArticles() {
    try {
      const res = await fetch(API_URL + '?estado=publicada');
      if (!res.ok) return null;
      const data = await res.json();
      return data.articles || [];
    } catch {
      return null;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short'
    });
  }

  function getCategoryClass(cat) {
    const map = {
      local: '', cultura: 'badge-categoria--cultura',
      economia: 'badge-categoria--economia', deportes: 'badge-categoria--deportes',
      entretenimiento: 'badge-categoria--entretenimiento', opinion: 'badge-categoria--opinion',
      turismo: 'badge-categoria--turismo'
    };
    return map[cat] || '';
  }

  function getArticleUrl(article) {
    return '/pages/nota.html?slug=' + encodeURIComponent(article.slug);
  }

  // ─── Populate Hero ───
  function populateHero(article) {
    if (!article) return;

    const heroTitle = document.querySelector('[data-editable-block="hero-titulo"]');
    const heroBajada = document.querySelector('[data-editable-block="hero-bajada"]');
    const heroImg = document.querySelector('[data-editable-image="hero-imagen"]');
    const heroBadge = document.querySelector('#hero .badge-categoria, .hero-editorial .badge-categoria');
    const heroAuthor = document.querySelector('.hero-editorial__meta .autor');
    const heroDate = document.querySelector('.hero-editorial__meta time');
    const heroLink = document.querySelector('.hero-editorial a.btn-cta');

    if (heroTitle) heroTitle.textContent = article.titulo;
    if (heroBajada) heroBajada.textContent = article.subtitulo || article.extracto;
    if (heroImg && article.imagen_destacada) {
      heroImg.src = article.imagen_destacada;
      heroImg.alt = article.imagen_alt || article.titulo;
    }
    if (heroBadge) heroBadge.textContent = (article.categoria || 'local').charAt(0).toUpperCase() + (article.categoria || 'local').slice(1);
    if (heroAuthor) heroAuthor.textContent = article.autor || '';
    if (heroDate) {
      heroDate.textContent = formatDate(article.fecha_publicacion);
      heroDate.setAttribute('datetime', article.fecha_publicacion || '');
    }
    if (heroLink) heroLink.href = getArticleUrl(article);
  }

  // ─── Populate Carousel ───
  function populateCarousel(articles) {
    const track = document.querySelector('.carousel__track');
    if (!track || articles.length === 0) return;

    track.innerHTML = articles.slice(0, 5).map(art => `
      <div class="carousel__slide">
        <img src="${art.imagen_destacada || 'https://picsum.photos/seed/' + art.slug + '/1200/500'}" alt="${art.imagen_alt || art.titulo}">
        <div class="carousel__slide-overlay"></div>
        <div class="carousel__slide-content">
          <span class="badge-categoria ${getCategoryClass(art.categoria)}">${(art.categoria || 'local').charAt(0).toUpperCase() + (art.categoria || 'local').slice(1)}</span>
          <h3>${art.titulo}</h3>
          <p>${art.extracto || art.subtitulo || ''}</p>
        </div>
      </div>
    `).join('');
  }

  // ─── Populate "Lo más leído" ───
  function populateMostRead(articles) {
    const list = document.querySelector('.lista-leidos');
    if (!list || articles.length === 0) return;

    list.innerHTML = articles.slice(0, 5).map(art => `
      <li class="lista-leidos__item">
        <h3 class="lista-leidos__titulo"><a href="${getArticleUrl(art)}">${art.titulo}</a></h3>
      </li>
    `).join('');
  }

  // ─── Populate Section Grid ───
  function populateSectionCard(sectionEl, article) {
    if (!sectionEl || !article) return;

    const img = sectionEl.querySelector('.card-imagen img');
    const title = sectionEl.querySelector('.card-titular');
    const author = sectionEl.querySelector('.card-meta .autor');
    const date = sectionEl.querySelector('.card-meta .fecha');
    const link = sectionEl.querySelector('a');

    if (img) {
      img.src = article.imagen_destacada || img.src;
      img.alt = article.imagen_alt || article.titulo;
    }
    if (title) title.textContent = article.titulo;
    if (author) author.textContent = article.autor || '';
    if (date) date.textContent = formatDateShort(article.fecha_publicacion);
    if (link) link.href = getArticleUrl(article);
  }

  // ─── Populate Brief News ───
  function populateBriefNews(articles) {
    const briefs = document.querySelectorAll('.card-nota--compacta');
    articles.slice(0, briefs.length).forEach((art, i) => {
      const title = briefs[i]?.querySelector('.card-titular');
      const date = briefs[i]?.querySelector('.card-meta .fecha');
      const badge = briefs[i]?.querySelector('.badge-categoria');
      if (title) title.textContent = art.titulo;
      if (date) date.textContent = formatDateShort(art.fecha_publicacion);
      if (badge) badge.textContent = (art.categoria || 'local').charAt(0).toUpperCase() + (art.categoria || 'local').slice(1);
    });
  }

  // ─── Main ───
  async function init() {
    const articles = await loadPublishedArticles();
    if (!articles || articles.length === 0) return; // Keep static content as fallback

    // Sort by date descending
    articles.sort((a, b) => new Date(b.fecha_publicacion || b.created_at) - new Date(a.fecha_publicacion || a.created_at));

    // Hero = most recent
    populateHero(articles[0]);

    // Carousel = top 5
    populateCarousel(articles);

    // Most read = all (sorted)
    populateMostRead(articles);

    // Section grid by category
    const byCategory = {};
    articles.forEach(a => {
      const cat = a.categoria || 'local';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(a);
    });

    // Populate grid sections (find by the section header text)
    const sectionHeaders = document.querySelectorAll('.grid-secciones > div');
    sectionHeaders.forEach(section => {
      const h3 = section.querySelector('h3');
      if (!h3) return;
      const headerText = h3.textContent.trim().toLowerCase();

      let category = null;
      if (headerText.includes('local')) category = 'local';
      else if (headerText.includes('cultura')) category = 'cultura';
      else if (headerText.includes('econom')) category = 'economia';
      else if (headerText.includes('deporte')) category = 'deportes';

      if (category && byCategory[category] && byCategory[category][0]) {
        populateSectionCard(section, byCategory[category][0]);
      }
    });

    // Brief news = mix of remaining articles
    const remaining = articles.slice(1);
    populateBriefNews(remaining);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

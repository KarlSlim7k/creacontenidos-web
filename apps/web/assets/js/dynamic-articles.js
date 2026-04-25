/**
 * CREA Contenidos — Dynamic Articles Loader
 * Loads articles from the CMS API and populates pages dynamically.
 */
(function () {
  'use strict';

  const API_URL = '/api/articles/crud.php';

  function formatDate(dateStr, short) {
    if (!dateStr) return '';
    const opts = short
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('es-MX', opts);
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

  function getCategoryLabel(cat) {
    if (!cat) return 'Local';
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  function getArticleUrl(article) {
    return '/pages/nota.html?slug=' + encodeURIComponent(article.slug);
  }

  function showError(container, msg) {
    if (!container) return;
    container.innerHTML = '<p style="color:var(--color-gris-medio);font-size:var(--text-sm);">' + msg + '</p>';
  }

  // ─── Fetch helpers ───
  async function fetchArticles(params) {
    const url = API_URL + '?' + new URLSearchParams(params).toString();
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.articles || [];
  }

  // ─── Load articles by category ───
  async function loadArticlesByCategory(categoria) {
    return fetchArticles({ categoria: categoria, estado: 'publicada' });
  }

  // ─── Load single article by slug ───
  async function loadArticleBySlug(slug) {
    const articles = await fetchArticles({ estado: 'publicada' });
    return articles.find(a => a.slug === slug) || null;
  }

  // ─── Load all published articles ───
  async function loadAllPublished() {
    return fetchArticles({ estado: 'publicada' });
  }

  // ─── Render article card ───
  function renderCard(article) {
    return `
      <article class="card-nota reveal">
        <a href="${getArticleUrl(article)}">
          <div class="card-imagen">
            <img src="${article.imagen_destacada || 'https://picsum.photos/seed/' + article.slug + '/400/250'}" alt="${article.imagen_alt || article.titulo}" loading="lazy">
            <span class="badge-categoria ${getCategoryClass(article.categoria)}">${getCategoryLabel(article.categoria)}</span>
          </div>
          <div class="card-contenido">
            <h3 class="card-titular">${article.titulo}</h3>
            <p class="card-bajada">${article.extracto || article.subtitulo || ''}</p>
            <footer class="card-meta">
              <span class="autor">${article.autor || ''}</span>
              <time class="fecha">${formatDate(article.fecha_publicacion, true)}</time>
            </footer>
          </div>
        </a>
      </article>
    `;
  }

  // ─── Render article cards to grid container ───
  function renderGrid(container, articles, cols) {
    if (!container) return;
    const limit = cols ? cols * 2 : articles.length;
    container.innerHTML = articles.slice(0, limit).map(renderCard).join('');
    container.style.gridTemplateColumns = 'repeat(' + (cols || 3) + ', 1fr)';
  }

  // ─── Populate section page hero ───
  function populateHero(heroEl, article) {
    if (!heroEl || !article) return;
    const img = heroEl.querySelector('.hero-editorial__imagen img');
    const badge = heroEl.querySelector('.badge-categoria');
    const title = heroEl.querySelector('.hero-editorial__titular');
    const bajada = heroEl.querySelector('.hero-editorial__bajada');
    const metaAutor = heroEl.querySelector('.autor');
    const metaTime = heroEl.querySelector('time');
    const link = heroEl.querySelector('a.btn-cta');

    if (img) {
      img.src = article.imagen_destacada || img.src;
      img.alt = article.imagen_alt || article.titulo;
    }
    if (badge) {
      badge.textContent = getCategoryLabel(article.categoria);
      badge.className = 'badge-categoria ' + getCategoryClass(article.categoria);
    }
    if (title) title.textContent = article.titulo;
    if (bajada) bajada.textContent = article.subtitulo || article.extracto || '';
    if (metaAutor) metaAutor.textContent = article.autor || '';
    if (metaTime) {
      metaTime.textContent = formatDate(article.fecha_publicacion, true);
      if (article.fecha_publicacion) metaTime.setAttribute('datetime', article.fecha_publicacion);
    }
    if (link) link.href = getArticleUrl(article);
  }

  // ─── Populate section page grid ───
  function populateGrid(gridEl, articles) {
    if (!gridEl) return;
    renderGrid(gridEl, articles, 3);
  }

  // ─── Populate sidebar "latest" list ───
  function populateSidebarList(listEl, articles, excludeSlug) {
    if (!listEl) return;
    const filtered = articles.filter(a => a.slug !== excludeSlug).slice(0, 5);
    listEl.innerHTML = filtered.map(art => `
      <li class="lista-leidos__item">
        <h3 class="lista-leidos__titulo"><a href="${getArticleUrl(art)}">${art.titulo}</a></h3>
      </li>
    `).join('');
  }

  // ─── Populate brief news items ───
  function populateBriefNews(briefEls, articles) {
    if (!briefEls) return;
    articles.slice(0, briefEls.length).forEach((art, i) => {
      const el = briefEls[i];
      if (!el) return;
      const title = el.querySelector('.card-titular');
      const date = el.querySelector('.card-meta .fecha');
      const badge = el.querySelector('.badge-categoria');
      const link = el.querySelector('a');
      if (title) {
        if (title.tagName === 'A') {
          title.textContent = art.titulo;
          title.href = getArticleUrl(art);
        } else {
          title.innerHTML = '<a href="' + getArticleUrl(art) + '">' + art.titular + '</a>';
        }
      }
      if (date) date.textContent = formatDate(art.fecha_publicacion, true);
      if (badge) badge.textContent = getCategoryLabel(art.categoria);
      if (link) link.href = getArticleUrl(art);
    });
  }

  // ─── Init section page ───
  async function initSeccionPage() {
    const pageId = document.body.getAttribute('data-page-id');
    if (!pageId) return;

    const categoriaMap = {
      local: 'local', cultura: 'cultura', economia: 'economia',
      entretenimiento: 'entretenimiento', deportes: 'deportes', opinion: 'opinion'
    };
    const categoria = categoriaMap[pageId];
    if (!categoria) return;

    const articles = await loadArticlesByCategory(categoria);
    if (!articles || articles.length === 0) return;

    // Hero
    const hero = document.querySelector('.hero-editorial');
    if (hero) populateHero(hero, articles[0]);

    // Grid
    const grid = document.querySelector('.grid-notas');
    if (grid) populateGrid(grid, articles.slice(1));

    // Sidebar list
    const sidebarList = document.querySelector('.articulo-sidebar .lista-leidos');
    if (sidebarList) populateSidebarList(sidebarList, articles, articles[0]?.slug);

    // Brief news in main grid (compact cards)
    const briefEls = document.querySelectorAll('.card-nota--compacta');
    if (briefEls.length) populateBriefNews(briefEls, articles);
  }

  // ─── Init nota page ───
  async function initNotaPage() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) return;

    const articles = await loadAllPublished();
    const art = articles.find(a => a.slug === slug);
    if (!art) return;

    // Title & meta
    document.title = art.titulo + ' — CREA Contenidos';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = art.meta_description || art.extracto || '';

    // Category badge
    const badge = document.querySelector('.badge-categoria');
    if (badge) {
      badge.textContent = getCategoryLabel(art.categoria);
      badge.className = 'badge-categoria ' + getCategoryClass(art.categoria);
    }

    // Title
    const h1 = document.querySelector('article h1');
    if (h1) h1.textContent = art.titulo;

    // Subtitle
    const subtitle = document.querySelector('article p[style*="font-accent"], article p[style*="font-size:var(--text-xl)"]');
    if (subtitle) subtitle.textContent = art.subtitulo || art.extracto || '';

    // Author
    const authorStrong = document.querySelector('article strong');
    if (authorStrong) authorStrong.textContent = art.autor || '';

    // Date
    const timeEl = document.querySelector('article time');
    if (timeEl && art.fecha_publicacion) {
      timeEl.textContent = formatDate(art.fecha_publicacion, false);
      timeEl.setAttribute('datetime', art.fecha_publicacion);
    }

    // Main image
    const mainImg = document.querySelector('figure img');
    if (mainImg && art.imagen_destacada) {
      mainImg.src = art.imagen_destacada;
      mainImg.alt = art.imagen_alt || art.titulo;
    }

    // Body content
    const body = document.querySelector('.articulo-body');
    if (body && art.contenido_html) {
      const divider = body.querySelector('hr');
      const review = body.querySelector('p[style*="italic"]');
      body.innerHTML = art.contenido_html;
      if (divider) body.appendChild(divider);
      if (review) body.appendChild(review);
    }

    // Breadcrumb
    const breadcrumbLast = document.querySelector('.breadcrumb span:last-child');
    if (breadcrumbLast) {
      const shortTitle = art.titulo.length > 60 ? art.titulo.substring(0, 60) + '...' : art.titulo;
      breadcrumbLast.textContent = shortTitle;
    }

    // Sidebar latest articles
    const sidebarCards = document.querySelectorAll('.articulo-sidebar .card-nota--compacta');
    const others = articles.filter(a => a.slug !== slug).slice(0, sidebarCards.length);
    others.forEach((other, i) => {
      if (!sidebarCards[i]) return;
      const link = sidebarCards[i].querySelector('a');
      const titleEl = sidebarCards[i].querySelector('.card-titular');
      const date = sidebarCards[i].querySelector('.card-meta .fecha');
      if (link) link.href = getArticleUrl(other);
      if (titleEl) {
        if (titleEl.tagName === 'A') {
          titleEl.textContent = other.titulo;
          titleEl.href = getArticleUrl(other);
        } else {
          titleEl.innerHTML = '<a href="' + getArticleUrl(other) + '">' + other.titulo + '</a>';
        }
      }
      if (date) date.textContent = formatDate(other.fecha_publicacion, true);
    });

    // Related notes at bottom
    const relatedGrid = document.querySelector('.seccion--gris .grid-notas');
    if (relatedGrid) {
      relatedGrid.innerHTML = articles.filter(a => a.slug !== slug).slice(0, 3).map(renderCard).join('');
    }
  }

  // ─── Init index page carousel & sections ───
  async function initIndexPage() {
    const articles = await loadAllPublished();
    if (!articles || articles.length === 0) return;

    articles.sort((a, b) => new Date(b.fecha_publicacion || b.created_at) - new Date(a.fecha_publicacion || a.created_at));

    // Hero
    const heroTitle = document.querySelector('.hero-editorial__titular');
    const heroBajada = document.querySelector('.hero-editorial__bajada');
    const heroImg = document.querySelector('.hero-editorial__imagen img');
    const heroBadge = document.querySelector('.hero-editorial .badge-categoria');
    const heroAuthor = document.querySelector('.hero-editorial__meta .autor');
    const heroDate = document.querySelector('.hero-editorial__meta time');
    const heroLink = document.querySelector('.hero-editorial a.btn-cta');

    if (heroTitle) heroTitle.textContent = articles[0].titulo;
    if (heroBajada) heroBajada.textContent = articles[0].subtitulo || articles[0].extracto;
    if (heroImg && articles[0].imagen_destacada) {
      heroImg.src = articles[0].imagen_destacada;
      heroImg.alt = articles[0].imagen_alt || articles[0].titulo;
    }
    if (heroBadge) {
      heroBadge.textContent = getCategoryLabel(articles[0].categoria);
      heroBadge.className = 'badge-categoria ' + getCategoryClass(articles[0].categoria);
    }
    if (heroAuthor) heroAuthor.textContent = articles[0].autor || '';
    if (heroDate) {
      heroDate.textContent = formatDate(articles[0].fecha_publicacion, false);
      heroDate.setAttribute('datetime', articles[0].fecha_publicacion || '');
    }
    if (heroLink) heroLink.href = getArticleUrl(articles[0]);

    // Carousel
    const track = document.querySelector('.carousel__track');
    if (track) {
      track.innerHTML = articles.slice(0, 5).map(art => `
        <div class="carousel__slide">
          <img src="${art.imagen_destacada || 'https://picsum.photos/seed/' + art.slug + '/1200/500'}" alt="${art.imagen_alt || art.titulo}">
          <div class="carousel__slide-overlay"></div>
          <div class="carousel__slide-content">
            <span class="badge-categoria ${getCategoryClass(art.categoria)}">${getCategoryLabel(art.categoria)}</span>
            <h3>${art.titulo}</h3>
            <p>${art.extracto || art.subtitulo || ''}</p>
          </div>
        </div>
      `).join('');
    }

    // Lo más leído
    const mostReadList = document.querySelector('.seccion--gris .lista-leidos');
    if (mostReadList) {
      mostReadList.innerHTML = articles.slice(0, 5).map(art => `
        <li class="lista-leidos__item">
          <h3 class="lista-leidos__titulo"><a href="${getArticleUrl(art)}">${art.titulo}</a></h3>
        </li>
      `).join('');
    }

    // Section grids
    const byCategory = {};
    articles.forEach(a => {
      const cat = a.categoria || 'local';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(a);
    });

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
        const card = section.querySelector('.card-nota');
        if (card) {
          const art = byCategory[category][0];
          const img = card.querySelector('.card-imagen img');
          const title = card.querySelector('.card-titular');
          const author = card.querySelector('.card-meta .autor');
          const date = card.querySelector('.card-meta .fecha');
          const link = card.querySelector('a');
          if (img) { img.src = art.imagen_destacada || img.src; img.alt = art.imagen_alt || art.titulo; }
          if (title) title.textContent = art.titulo;
          if (author) author.textContent = art.autor || '';
          if (date) date.textContent = formatDate(art.fecha_publicacion, true);
          if (link) link.href = getArticleUrl(art);
        }
      }
    });

    // Brief news
    const briefs = document.querySelectorAll('.card-nota--compacta');
    const remaining = articles.slice(1);
    briefs.forEach((brief, i) => {
      const art = remaining[i % remaining.length];
      if (!art) return;
      const title = brief.querySelector('.card-titular');
      const date = brief.querySelector('.card-meta .fecha');
      const badge = brief.querySelector('.badge-categoria');
      const link = brief.querySelector('a');
      if (title) {
        if (title.tagName === 'A') { title.textContent = art.titulo; title.href = getArticleUrl(art); }
        else { title.innerHTML = '<a href="' + getArticleUrl(art) + '">' + art.titulo + '</a>'; }
      }
      if (date) date.textContent = formatDate(art.fecha_publicacion, true);
      if (badge) badge.textContent = getCategoryLabel(art.categoria);
      if (link) link.href = getArticleUrl(art);
    });
  }

  // ─── Bootstrap ───
  function init() {
    const pageId = document.body.getAttribute('data-page-id');

    if (pageId === 'home') {
      initIndexPage();
    } else if (pageId === 'nota') {
      initNotaPage();
    } else if (['local', 'cultura', 'economia', 'entretenimiento', 'deportes', 'opinion'].includes(pageId)) {
      initSeccionPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  window.CreaArticles = {
    loadArticlesByCategory,
    loadArticleBySlug,
    loadAllPublished,
    renderGrid,
    getArticleUrl,
    formatDate
  };
})();

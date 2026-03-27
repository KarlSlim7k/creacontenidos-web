/* CREA Contenidos — carousel.js */
(function () {
  'use strict';

  function initCarousel() {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;

    const track = carousel.querySelector('.carousel__track');
    const slides = carousel.querySelectorAll('.carousel__slide');
    const dotsContainer = carousel.querySelector('.carousel__dots');
    const prevBtn = carousel.querySelector('.carousel__nav--prev');
    const nextBtn = carousel.querySelector('.carousel__nav--next');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    let autoplayTimer = null;
    let startX = 0;
    let isDragging = false;

    // Crear dots
    slides.forEach(function (_, i) {
      const dot = document.createElement('button');
      dot.classList.add('carousel__dot');
      dot.setAttribute('aria-label', 'Ir a la diapositiva ' + (i + 1));
      if (i === 0) dot.classList.add('is-active');
      dot.addEventListener('click', function () { goToSlide(i); });
      if (dotsContainer) dotsContainer.appendChild(dot);
    });

    function goToSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentIndex = index;
      track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';

      // Actualizar dots
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.carousel__dot').forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === currentIndex);
        });
      }
    }

    function nextSlide() { goToSlide(currentIndex + 1); }
    function prevSlide() { goToSlide(currentIndex - 1); }

    // Controles
    if (nextBtn) nextBtn.addEventListener('click', function () { nextSlide(); resetAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { prevSlide(); resetAutoplay(); });

    // Autoplay
    function startAutoplay() {
      autoplayTimer = setInterval(nextSlide, 5000);
    }
    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
    }
    function resetAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    // Pausar al hover
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);

    // Swipe táctil
    carousel.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      isDragging = true;
      stopAutoplay();
    }, { passive: true });

    carousel.addEventListener('touchend', function (e) {
      if (!isDragging) return;
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextSlide();
        else prevSlide();
      }
      isDragging = false;
      startAutoplay();
    }, { passive: true });

    // Teclado
    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { prevSlide(); resetAutoplay(); }
      if (e.key === 'ArrowRight') { nextSlide(); resetAutoplay(); }
    });

    startAutoplay();
  }

  document.addEventListener('DOMContentLoaded', initCarousel);
})();

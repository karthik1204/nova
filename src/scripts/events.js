document.addEventListener('click', (e) => {
  const button = e.target.closest('button'),
    link = e.target.closest('a');
  if (link?.hasAttribute('data-close-bag')) $('#bag-dialog').close();
  if (link && link.closest('#mobile-menu')) {
    $('#mobile-menu').close();
    $('#menu-open').setAttribute('aria-expanded', 'false');
  }
  if (!button) return;
  if (button.hasAttribute('data-open-bag')) {
    renderBag();
    if (!$('#bag-dialog').open) $('#bag-dialog').showModal();
  }
  if (button.dataset.cardSize !== undefined) {
    const i = Number(button.dataset.product),
      s = Number(button.dataset.cardSize);
    selectedSizes[i] = s;
    $$('[data-card="' + i + '"]').forEach((card) => {
      card
        .querySelectorAll('.card-size')
        .forEach((b, j) => b.setAttribute('aria-pressed', String(j === s)));
      card.querySelector('.card-price').textContent =
        '$' + products[i].variants[s].price.toFixed(2);
    });
  }
  if (button.dataset.addBag !== undefined) {
    const i = Number(button.dataset.addBag),
      s = selectedSizes[i],
      key = i + '-' + s,
      line = bag.get(key) || { product: i, size: s, qty: 0 };
    line.qty++;
    bag.set(key, line);
    renderBag();
    $('#bag-status').textContent =
      products[i].name + ', ' + products[i].variants[s].size + ' added to your bag.';
    $('#bag-dialog').showModal();
  }
  if (button.dataset.bagQuantity) {
    const key = button.dataset.bagQuantity,
      line = bag.get(key),
      delta = Number(button.dataset.delta);
    if (line) {
      line.qty += delta;
      if (line.qty <= 0) bag.delete(key);
      renderBag();
      const next = $('[data-bag-quantity="' + key + '"][data-delta="' + delta + '"]');
      if (next) next.focus();
      else $('#bag-dialog [data-close]').focus();
      $('#bag-status').textContent = 'Bag updated.';
    }
  }
  if (button.dataset.bagRemove) {
    bag.delete(button.dataset.bagRemove);
    renderBag();
    $('#bag-status').textContent = 'Item removed.';
    $('#bag-dialog [data-close]').focus();
  }
  if (button.dataset.size !== undefined) {
    const i = Number(button.dataset.index);
    selectedSizes[i] = Number(button.dataset.size);
    if (button.dataset.scope === 'hero') {
      const focusIndex = selectedSizes[i];
      renderHero();
      $('.hero-copy [data-size="' + focusIndex + '"]').focus({ preventScroll: true });
    } else {
      $$('.detail-copy .size').forEach((b, n) =>
        b.setAttribute('aria-pressed', String(n === selectedSizes[i]))
      );
      $('#detail-price').textContent =
        '$' + products[i].variants[selectedSizes[i]].price.toFixed(2);
    }
    lastAdvance = performance.now();
  }
  if (button.dataset.slide !== undefined) changeSlide(Number(button.dataset.slide));
  if (button.dataset.preview !== undefined) {
    const index = Number(button.dataset.preview);
    if (!homeActive) {
      location.hash = '#/';
      renderRoute(false);
    }
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    changeSlide(index, true);
  }
  if (button.dataset.filter) {
    $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    $('#shop-grid').innerHTML = cards(
      products.filter(
        (p) =>
          button.dataset.filter === 'all' ||
          (button.dataset.filter === 'tonic' ? p.key !== 'broth' : p.key === 'broth')
      )
    );
    observe();
  }
  if (button.dataset.library) {
    const i = Number(button.dataset.library);
    $$('[data-library]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    $('#library-grid').innerHTML = library(products[i], i);
    observe();
  }
  if (button.dataset.openProductGallery !== undefined)
    openProductGallery(
      Number(button.dataset.openProductGallery),
      Number(button.dataset.galleryOpenIndex || 0)
    );
  if (button.dataset.galleryPhoto !== undefined)
    selectGalleryPhoto(Number(button.dataset.galleryPhoto), button.dataset.galleryScope);
  if (button.dataset.galleryStep !== undefined)
    stepGallery(Number(button.dataset.galleryStep), button.dataset.galleryScope);
  if (button.dataset.lightbox) {
    $('#lightbox-image').src = asset(button.dataset.lightbox);
    $('#lightbox-image').alt = button.querySelector('img').alt;
    $('#image-dialog').showModal();
  }
  if (button.dataset.ingredient) {
    const [i, j] = button.dataset.ingredient.split(':').map(Number),
      ing = products[i].ingredients[j];
    $('#ingredient-dialog-content').innerHTML =
      '<div class="ingredient-dialog">' +
      photo(ing.image, ing.name) +
      '<div class="ingredient-dialog-copy"><p class="eyebrow">Ingredient Notes</p><h2>' +
      esc(ing.name) +
      '</h2><p>' +
      esc(ing.description) +
      '</p><small>These statements have not been evaluated by the FDA.</small></div></div>';
    $('#ingredient-dialog').showModal();
  }
  if (button.hasAttribute('data-close')) button.closest('dialog').close();
});
$$('dialog').forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        d.close();
    }
  })
);
$('#menu-open').onclick = () => {
  $('#mobile-menu').showModal();
  $('#menu-open').setAttribute('aria-expanded', 'true');
};
$('#mobile-menu').addEventListener('close', () =>
  $('#menu-open').setAttribute('aria-expanded', 'false')
);
$('#theme-toggle').onclick = () => {
  const isDark = getComputedStyle(document.documentElement).colorScheme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  $('#theme-toggle').setAttribute(
    'aria-label',
    'Switch to ' + (isDark ? 'dark' : 'light') + ' theme'
  );
};
$('#previous').onclick = () => changeSlide((selected + 2) % 3, false, -1);
$('#next').onclick = () => changeSlide((selected + 1) % 3, false, 1);
$('#pause').onclick = () => {
  playing = !playing;
  if (reduced) playing = false;
  lastAdvance = performance.now();
  setPauseUI();
};
hero.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    changeSlide((selected + 2) % 3, false, -1);
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    changeSlide((selected + 1) % 3, false, 1);
  }
});
let touchStart = null;
hero.addEventListener(
  'touchstart',
  (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  },
  { passive: true }
);
hero.addEventListener(
  'touchend',
  (e) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x,
      dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3)
      changeSlide((selected + (dx < 0 ? 1 : 2)) % 3, false, dx < 0 ? 1 : -1);
    touchStart = null;
  },
  { passive: true }
);
hero.addEventListener('pointermove', (e) => {
  const r = hero.getBoundingClientRect();
  pointer.x = (e.clientX - r.left) / r.width - 0.5;
  pointer.y = (e.clientY - r.top) / r.height - 0.5;
});
hero.addEventListener('pointerleave', () => (pointer.x = pointer.y = 0));
document.addEventListener('visibilitychange', () => {
  lastAdvance = performance.now();
  previousFrame = performance.now();
});
motionQuery.addEventListener('change', (e) => {
  reduced = e.matches;
  playing = !reduced;
  lastAdvance = performance.now();
  setPauseUI();
  if (reduced) {
    transition = null;
    pending = null;
    document.documentElement.classList.remove('js-motion');
    models.forEach((m, i) => {
      m.visible = i === selected;
      m.position.set(0, 0, 0);
      m.rotation.set(0, 0, 0);
      m.scale.setScalar(1);
    });
  }
});
new IntersectionObserver(
  (entries) => {
    heroVisible = entries[0].isIntersecting;
    lastAdvance = performance.now();
  },
  { threshold: 0.05 }
).observe(hero);

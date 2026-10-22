// Isolated from the hero: review motion never changes product transition state.
(() => {
  const section = document.getElementById('reviews');
  if (!section) return;
  const demo = window.NOVA_REVIEWS_DEMO === true;
  const samples = [
    {
      product: 'digestive',
      name: 'Customer A · Sample',
      rating: 5,
      message: 'Beautiful packaging and thoughtful details. A lovely addition to my daily routine.',
      visible: true
    },
    {
      product: 'immunity',
      name: 'Customer B · Sample',
      rating: 5,
      message: 'Easy to order, carefully packed, and delivered with care.',
      visible: true
    },
    {
      product: 'broth',
      name: 'Customer C · Sample',
      rating: 4,
      message: 'A comforting ritual for slow evenings. I loved the attention to detail.',
      visible: true
    }
  ];
  const reviews = (demo ? samples : window.NOVA_REVIEWS || []).filter((r) => r.visible);
  if (!reviews.length) return;
  section.hidden = false;
  document.getElementById('reviews-demo-note').hidden = !demo;
  const track = document.getElementById('reviews-track');
  const filters = section.querySelector('.reviews-filters');
  const pause = document.getElementById('reviews-pause');
  const previous = document.getElementById('reviews-prev');
  const next = document.getElementById('reviews-next');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches,
    hovered = false,
    focused = false,
    touching = false;
  let visible = false,
    direction = 1,
    last = 0,
    animation = 0,
    waitUntil = 0,
    autoPosition = 0;
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  function updatePause() {
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', (paused ? 'Play' : 'Pause') + ' automatic review scrolling');
  }
  function bounds() {
    return Math.max(0, track.scrollWidth - track.clientWidth);
  }
  function controls() {
    const overflow = bounds() > 2;
    previous.disabled = !overflow;
    next.disabled = !overflow;
    pause.disabled = !overflow || motion.matches;
  }
  function render(product = 'all') {
    const items = reviews.filter((r) => product === 'all' || r.product === product);
    track.replaceChildren();
    for (const review of items) {
      const p = window.NOVA_DATA.products.find((item) => item.key === review.product);
      if (!p) continue;
      const article = make('article', 'review-card review-' + p.key);
      const top = make('div', 'review-card-top');
      const stars = make(
        'span',
        'review-stars',
        '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
      );
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', review.rating + ' out of 5 stars');
      top.append(stars, make('span', 'review-quote', '“'));
      const quote = make('blockquote', '', review.message);
      const person = make('p', 'review-name', review.name);
      const productLink = make('a', 'review-product');
      productLink.href = '#/product/' + p.key;
      const image = make('img');
      image.src = window.NOVA_DATA.assets[p.cutout];
      image.alt = '';
      image.loading = 'lazy';
      image.width = 40;
      image.height = 64;
      const text = make('span');
      text.append(
        make('small', '', demo ? 'Sample review for' : 'A ritual with'),
        make('span', '', p.name)
      );
      productLink.append(image, text, make('span', 'review-link-arrow', '↗'));
      article.append(top, quote, person, productLink);
      track.append(article);
    }
    if (!items.length) track.append(make('p', 'reviews-empty', 'No reviews for this ritual yet.'));
    for (const button of filters.children)
      button.setAttribute('aria-pressed', String(button.dataset.product === product));
    document.getElementById('reviews-count').textContent = demo
      ? 'Preview only · 3 product rituals'
      : items.length + (items.length === 1 ? ' customer story' : ' customer stories');
    track.scrollLeft = 0;
    autoPosition = 0;
    direction = 1;
    waitUntil = performance.now() + 2500;
    controls();
  }
  for (const [key, name] of [
    ['all', 'All rituals'],
    ...window.NOVA_DATA.products.map((p) => [p.key, p.name])
  ]) {
    const button = make('button', '', name);
    button.type = 'button';
    button.dataset.product = key;
    button.onclick = () => render(key);
    filters.append(button);
  }
  function move(sign) {
    paused = true;
    updatePause();
    const max = bounds();
    const atEnd = sign > 0 && track.scrollLeft >= max - 2;
    const atStart = sign < 0 && track.scrollLeft <= 2;
    track.scrollTo({
      left: atEnd ? 0 : atStart ? max : track.scrollLeft + sign * track.clientWidth * 0.7,
      behavior: motion.matches ? 'auto' : 'smooth'
    });
  }
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  pause.onclick = () => {
    paused = !paused;
    updatePause();
  };
  track.addEventListener('keydown', (event) => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  section.addEventListener('mouseenter', () => {
    hovered = true;
  });
  section.addEventListener('mouseleave', () => {
    hovered = false;
  });
  section.addEventListener('focusin', () => {
    focused = true;
  });
  section.addEventListener('focusout', (event) => {
    focused = section.contains(event.relatedTarget);
  });
  track.addEventListener('pointerdown', () => {
    touching = true;
    paused = true;
    updatePause();
  });
  window.addEventListener('pointerup', () => {
    touching = false;
  });
  window.addEventListener('pointercancel', () => {
    touching = false;
  });
  track.addEventListener(
    'wheel',
    () => {
      paused = true;
      updatePause();
    },
    { passive: true }
  );
  function tick(now) {
    const dt = Math.min(now - last, 40);
    last = now;
    if (
      !paused &&
      !motion.matches &&
      !hovered &&
      !focused &&
      !touching &&
      now > waitUntil &&
      bounds() > 2
    ) {
      // Keep subpixel progress ourselves; some engines round scrollLeft on assignment.
      autoPosition = Math.max(0, Math.min(bounds(), autoPosition + direction * dt * 0.022));
      track.scrollLeft = autoPosition;
      if (autoPosition >= bounds() || autoPosition <= 0) {
        direction *= -1;
        waitUntil = now + 2000;
      }
    } else autoPosition = track.scrollLeft;
    animation = requestAnimationFrame(tick);
  }
  function syncAnimation() {
    cancelAnimationFrame(animation);
    if (visible && !document.hidden) {
      last = performance.now();
      animation = requestAnimationFrame(tick);
    }
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncAnimation();
  }).observe(section);
  document.addEventListener('visibilitychange', syncAnimation);
  motion.addEventListener('change', () => {
    paused = motion.matches;
    updatePause();
    controls();
  });
  new ResizeObserver(controls).observe(track);
  render();
  updatePause();
})();

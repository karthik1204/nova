const DATA = window.NOVA_DATA,
  products = DATA.products,
  $ = (s) => document.querySelector(s),
  $$ = (s) => Array.from(document.querySelectorAll(s));
const asset = (name) => DATA.assets[name],
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    ),
  motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionQuery.matches,
  selected = 0,
  selectedSizes = [0, 0, 0],
  playing = !reduced,
  transition = null,
  pending = null,
  lastAdvance = performance.now(),
  homeActive = true,
  modelsReady = false,
  heroVisible = true,
  renderer,
  scene,
  camera,
  modelRoot,
  models = [],
  currentScale = 1,
  raf = 0,
  previousFrame = performance.now(),
  elapsed = 0;
const hero = $('#hero'),
  home = $('#home-view'),
  page = $('#page-view'),
  pointer = { x: 0, y: 0 },
  slideDuration = 2000,
  transitionDuration = 1000;
const photo = (id, alt, extra = '') =>
  '<img src="' + asset(id) + '" alt="' + esc(alt) + '" ' + extra + '>';
function hydrate(root = document) {
  root.querySelectorAll('[data-image]').forEach((im) => {
    im.src = asset(im.dataset.image);
    im.removeAttribute('data-image');
  });
}
function sizeButtons(p, index, scope) {
  return (
    '<div class="sizes" aria-label="Choose size">' +
    p.variants
      .map(
        (v, i) =>
          '<button class="size" data-size="' +
          i +
          '" data-index="' +
          index +
          '" data-scope="' +
          scope +
          '" aria-pressed="' +
          (i === selectedSizes[index]) +
          '">' +
          esc(v.size) +
          '</button>'
      )
      .join('') +
    '</div>'
  );
}

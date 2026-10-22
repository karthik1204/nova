const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read, content } = require('./site_source.cjs');

class Element {
  constructor(tag = 'div') {
    this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {};
    this.events = {}; this.hidden = true; this.scrollLeft = 0; this.scrollWidth = 1200; this.clientWidth = 900;
  }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(k, v) { this.attributes[k] = v; }
  addEventListener(k, fn) { this.events[k] = fn; }
  contains(item) { return this.children.includes(item); }
  scrollTo({ left }) { this.scrollLeft = left; }
}
function fixture(reviews = [], demo = false, reduced = false) {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  get('reviews').querySelector = () => get('filters');
  const motion = { matches: reduced, addEventListener() {} };
  const frames = new Map(); let frameID = 0;
  const doc = { hidden: false, getElementById: get, createElement: (tag) => new Element(tag), addEventListener() {} };
  const context = vm.createContext({
    window: { NOVA_DATA: content(), NOVA_REVIEWS: reviews, NOVA_REVIEWS_DEMO: demo, addEventListener() {} },
    document: doc, matchMedia: () => motion, performance: { now: () => 0 },
    requestAnimationFrame: (callback) => { frames.set(++frameID, callback); return frameID; },
    cancelAnimationFrame: (id) => frames.delete(id),
    IntersectionObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ isIntersecting: true }]); } },
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } }
  });
  vm.runInContext(read('src/scripts/reviews.js'), context);
  return { get, frames, motion, step(now) { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(now); } };
}
assert.equal(fixture().get('reviews').hidden, true, 'No public fake reviews');
const hidden = { product: 'broth', name: 'Name', message: 'Message', rating: 3, visible: false };
assert.equal(fixture([hidden]).get('reviews').hidden, true);
const demo = fixture([], true);
assert.equal(demo.get('reviews').hidden, false);
assert.equal(demo.get('reviews-demo-note').hidden, false);
assert.equal(demo.get('reviews-track').children.length, 3);
for (let i = 1; i <= 3; i++) {
  demo.get('filters').children[i].onclick();
  assert.equal(demo.get('reviews-track').children.length, 1);
  assert.equal(demo.get('reviews-track').children[0].className, 'review-card review-' + content().products[i - 1].key);
}
demo.get('filters').children[0].onclick();
const track = demo.get('reviews-track');
Object.defineProperty(track, 'scrollLeft', { get() { return this.position || 0; }, set(v) { this.position = Math.round(v); }, configurable: true });
for (let time = 2600; time < 4000; time += 16) demo.step(time);
assert.ok(track.scrollLeft > 20, 'Autoscroll advances even if browser rounds subpixel positions');
demo.get('reviews').events.mouseenter();
const beforeHover = track.scrollLeft;
demo.step(4016); assert.equal(track.scrollLeft, beforeHover, 'Hover pauses');
demo.get('reviews').events.mouseleave();
demo.get('reviews-pause').onclick();
demo.step(4032); assert.equal(track.scrollLeft, beforeHover, 'Pause button pauses');
demo.get('reviews-next').onclick();
assert.ok(track.scrollLeft > beforeHover, 'Next control moves track');
const noMotion = fixture([], true, true);
for (let time = 2600; time < 3000; time += 16) noMotion.step(time);
assert.equal(noMotion.get('reviews-track').scrollLeft, 0);
assert.equal(noMotion.get('reviews-pause').disabled, true);
const literal = '<img src=x onerror=alert(1)>';
const live = fixture([{ ...hidden, visible: true, message: literal }]);
assert.equal(live.get('reviews-track').children[0].children[1].textContent, literal, 'Review text stays literal, not HTML');
assert.equal(live.get('reviews-demo-note').hidden, true);
live.get('filters').children[1].onclick();
assert.equal(live.get('reviews-track').children[0].textContent, 'No reviews for this ritual yet.');
console.log('PASS: review visibility, three-product filters, literal text, demo isolation, subpixel autoplay, hover/manual pause, arrows and reduced motion.');

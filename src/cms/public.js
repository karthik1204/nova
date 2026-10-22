import config from './config.json';
import { cleanContent, editableText, editableAsset } from './content.js';
import { colorsCSS, textScope } from './settings.js';

const base = structuredClone(window.NOVA_DATA.assets);
const rootURL = new URL('../', document.currentScript.src);
// Resolve once, not once per asset per image on every content mutation.
const originalImageKeys = new Map(
  Object.entries(base).reverse().map(([key, url]) => [new URL(url, rootURL).href, key])
);
const isPreview =
  new URLSearchParams(location.search).has('cms-preview') && window.parent !== window;
let edits,
  editorEnabled = false;
const originals = new WeakMap();
const hiddenImages = new WeakSet();
const route = () => (location.hash.startsWith('#/') ? location.hash.slice(2) : '');
let catalogTimer;

async function readContent() {
  if (isPreview) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({}), 4000);
      window.addEventListener('message', function receive(event) {
        if (
          event.origin !== location.origin ||
          event.source !== parent ||
          event.data?.type !== 'nova-draft'
        )
          return;
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        editorEnabled = event.data.edit === true;
        resolve(event.data.content);
      });
      parent.postMessage({ type: 'nova-ready' }, location.origin);
    });
  }
  try {
    const response = await fetch(
      config.url + '/rest/v1/website_content?id=eq.published&select=content',
      {
        headers: { apikey: config.publishableKey },
        signal: AbortSignal.timeout(2500),
        cache: 'no-store'
      }
    );
    if (!response.ok) throw new Error('Content unavailable');
    return (await response.json())[0]?.content || {};
  } catch {
    return {};
  } // Local approved content remains available during backend outages.
}

function applyText(root) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const node = walk.currentNode;
    if (node.parentElement.closest('script,style,textarea,input,[contenteditable]')) continue;
    const previous = originals.get(node);
    const original =
      previous && node.nodeValue === previous.rendered ? previous.original : node.nodeValue;
    const key = original.trim();
    const scoped = edits.pages[textScope(node.parentElement, route())] || {};
    const replacement = editableText(key)
      ? Object.hasOwn(scoped, key)
        ? scoped[key]
        : Object.hasOwn(edits.texts, key)
          ? edits.texts[key]
          : null
      : null;
    const rendered = replacement === null ? original : original.replace(key, () => replacement);
    originals.set(node, { original, rendered });
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
  }
}
function sendCatalog() {
  if (!isPreview) return;
  clearTimeout(catalogTimer);
  catalogTimer = setTimeout(() => {
    const entries = new Map();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const node = walk.currentNode,
        owner = node.parentElement;
      if (
        owner.closest('script,style,textarea,input,[contenteditable],[hidden]') ||
        !owner.getClientRects().length
      )
        continue;
      const original = (originals.get(node)?.original || node.nodeValue).trim();
      if (!editableText(original)) continue;
      const scope = textScope(owner, route());
      const section = owner.closest('section,footer,header,dialog');
      const label =
        scope === 'global'
          ? 'Header / footer'
          : section?.getAttribute('aria-label') || section?.id || section?.className || 'Page text';
      entries.set(scope + '\n' + original, {
        original,
        scope,
        section: String(label).slice(0, 100)
      });
    }
    const images = [...document.images]
      .filter((img) => !img.closest('[hidden]'))
      .map((img) => ({
        key: Object.keys(base).find(
          (id) => new URL(window.NOVA_DATA.assets[id], rootURL).href === img.src
        ),
        alt: img.alt
      }))
      .filter((i) => i.key);
    parent.postMessage(
      { type: 'nova-catalog', route: route(), entries: [...entries.values()], images },
      location.origin
    );
  }, 150);
}
function applyHiddenImages() {
  for (const img of document.images) {
    const key = originalImageKeys.get(img.src);
    if (key && edits.images[key] === null) {
      img.hidden = true;
      hiddenImages.add(img);
    } else if (hiddenImages.has(img)) {
      img.hidden = false;
      hiddenImages.delete(img);
    }
  }
}
function enableEditor() {
  if (!editorEnabled) return;
  document.addEventListener(
    'click',
    (event) => {
      if (event.altKey) return; // Alt-click keeps normal navigation available in edit mode.
      const target = event.target;
      const img = target.closest('img');
      const key =
        img &&
        Object.keys(base).find(
          (id) => new URL(window.NOVA_DATA.assets[id], rootURL).href === img.src
        );
      if (key && editableAsset(key, base)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        parent.postMessage({ type: 'nova-select-image', key }, location.origin);
        return;
      }
      const nodes = [...target.childNodes].filter(
        (n) => n.nodeType === Node.TEXT_NODE && editableText(n.nodeValue)
      );
      if (!nodes.length) return;
      const node = nodes[0];
      const original = (originals.get(node)?.original || node.nodeValue).trim();
      event.preventDefault();
      event.stopImmediatePropagation();
      parent.postMessage(
        { type: 'nova-select-text', original, scope: textScope(node.parentElement, route()) },
        location.origin
      );
    },
    true
  );
}

async function start() {
  edits = cleanContent(await readContent(), base);
  window.NOVA_REVIEWS = edits.reviews;
  // Demo content is never saved or published. It is limited to the editor or localhost.
  window.NOVA_REVIEWS_DEMO =
    !edits.reviews.length &&
    (isPreview ||
      (['127.0.0.1', 'localhost'].includes(location.hostname) &&
        new URLSearchParams(location.search).has('reviews-demo')));
  const style = document.createElement('style');
  style.textContent = colorsCSS(edits.colors);
  document.head.append(style);
  for (const p of window.NOVA_DATA.products) {
    if (edits.colors[p.key + 'Background']) p.color = edits.colors[p.key + 'Background'];
    if (edits.prices[p.key]?.length === p.variants.length)
      p.variants.forEach((v, i) => (v.price = edits.prices[p.key][i]));
  }
  for (const [key, url] of Object.entries(edits.images))
    if (url) window.NOVA_DATA.assets[key] = url;
  window.NOVA_CMS_GALLERIES = {};
  for (const [key, items] of Object.entries(edits.galleries)) {
    window.NOVA_CMS_GALLERIES[key] = items.map((item, index) => {
      const id = 'cms-' + key + '-' + index;
      window.NOVA_DATA.assets[id] = item.url;
      return { id, alt: item.alt, caption: item.caption, scene: false };
    });
  }
  const app = document.createElement('script');
  app.src = new URL('assets/app.js', rootURL);
  app.onload = () => {
    applyText(document.body);
    applyHiddenImages();
    enableEditor();
    sendCatalog();
    const observer = new MutationObserver(() => {
      observer.disconnect();
      applyText(document.body);
      applyHiddenImages();
      observe();
      sendCatalog();
    });
    const observe = () =>
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    observe();
  };
  document.body.append(app);
}
start();

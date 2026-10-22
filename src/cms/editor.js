import { pages, colorFields, sections, validScope } from './settings.js';
import { editableAsset, editableText } from './content.js';
import { createReviewsEditor } from './reviews-editor.js';

export function createEditor({ data, getDraft, changed, refresh, selectText, selectImage }) {
  const reviewsEditor = createReviewsEditor({ data, getDraft, changed, refresh });
  const $ = (id) => document.getElementById(id);
  const node = (tag, text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  let catalog = [],
    currentRoute = '',
    currentImages = [];
  $('page').replaceChildren(
    ...pages.map(([value, label]) => {
      const option = node('option', label);
      option.value = value;
      return option;
    })
  );

  function copyExtras() {
    const result = [];
    const add = (original, section) => {
      if (editableText(original)) result.push({ original, section, scope: currentRoute });
    };
    const relevant = currentRoute.startsWith('product/')
      ? data.products.filter((p) => p.key === currentRoute.split('/')[1])
      : currentRoute === 'ingredients'
        ? data.products
        : [];
    for (const p of relevant) {
      for (const key of ['name', 'short', 'description', 'tag']) add(p[key], p.name + ' · ' + key);
      for (const ing of p.ingredients) {
        add(ing.name, p.name + ' · Ingredient');
        add(ing.description, p.name + ' · ' + ing.name + ' details');
      }
    }
    if (currentRoute === 'story') data.story.forEach((text) => add(text, 'Story article'));
    return result;
  }
  function renderTexts() {
    const query = $('text-search').value.toLowerCase(),
      list = $('text-list');
    const entries = new Map();
    for (const item of [...catalog, ...copyExtras()])
      if (validScope(item.scope) && editableText(item.original))
        entries.set(item.scope + '\n' + item.original, item);
    const filtered = [...entries.values()].filter((item) =>
      (item.original + ' ' + (getDraft().pages[item.scope]?.[item.original] || ''))
        .toLowerCase()
        .includes(query)
    );
    list.replaceChildren();
    $('text-count').textContent =
      filtered.length +
      ' text fields · ' +
      (pages.find(([route]) => route === currentRoute)?.[1] || 'Page');
    for (const item of filtered) {
      const b = node('button');
      b.className = 'text-entry';
      b.type = 'button';
      b.append(
        node(
          'small',
          item.scope === 'global' ? 'Shared header / footer' : item.section.replace(/-/g, ' ')
        ),
        node(
          'span',
          getDraft().pages[item.scope]?.[item.original] ??
            getDraft().texts[item.original] ??
            item.original
        )
      );
      b.onclick = () => selectText(item.original, item.scope);
      list.append(b);
    }
    if (!filtered.length)
      list.append(
        node(
          'p',
          'Wait for the preview to load, or try a different search. Open a tab or dialog in the preview to include its text.'
        )
      );
  }
  function renderColors() {
    const box = $('color-list');
    box.replaceChildren();
    function picker(container, key, label, fallback) {
      const row = node('label', label);
      row.className = 'color-row';
      const input = node('input');
      input.type = 'color';
      input.value = getDraft().colors[key] || fallback;
      input.setAttribute('aria-label', label);
      input.onchange = () => {
        getDraft().colors[key] = input.value;
        changed();
        refresh();
      };
      const reset = node('button', 'Reset');
      reset.type = 'button';
      reset.onclick = () => {
        delete getDraft().colors[key];
        changed();
        renderColors();
        refresh();
      };
      row.append(input, reset);
      container.append(row);
    }
    const global = node('details');
    global.open = true;
    global.append(node('summary', 'Website palette'));
    for (const [key, label, , fallback] of colorFields) picker(global, key, label, fallback);
    picker(global, 'buttonBackground', 'Button background', '#253c30');
    picker(global, 'buttonText', 'Button text', '#ffffff');
    box.append(global);
    const hero = node('details');
    hero.append(node('summary', 'Product slide backgrounds'));
    for (const p of data.products) picker(hero, p.key + 'Background', p.name, p.color);
    box.append(hero);
    for (const [key, label] of sections) {
      const detail = node('details');
      detail.append(node('summary', label));
      picker(detail, key + 'Background', label + ' background', '#f6f3e9');
      picker(detail, key + 'Text', label + ' text', '#272b20');
      box.append(detail);
    }
  }
  function renderImages() {
    const list = $('image-list'),
      query = $('image-search').value.toLowerCase();
    list.replaceChildren();
    const keys =
      $('image-scope').value === 'all' ? Object.keys(data.assets) : currentImages.map((i) => i.key);
    for (const key of [...new Set(keys)].filter((k) => editableAsset(k, data.assets))) {
      const label = currentImages.find((i) => i.key === key)?.alt || key;
      if (!(label + ' ' + key).toLowerCase().includes(query)) continue;
      const b = node('button');
      b.type = 'button';
      b.className = 'image-entry';
      const img = node('img');
      img.src = new URL(getDraft().images[key] || data.assets[key], new URL('../', location.href));
      img.alt = '';
      img.loading = 'lazy';
      b.append(img, node('span', label + (getDraft().images[key] === null ? ' · Hidden' : '')));
      b.onclick = () => selectImage(key);
      list.append(b);
    }
    if (!list.children.length)
      list.append(
        node(
          'p',
          'No matching photos. Choose All website images to find photos on other pages or restore hidden images.'
        )
      );
  }
  function renderPrices() {
    const box = $('price-list');
    box.replaceChildren();
    for (const p of data.products) {
      box.append(node('h3', p.name));
      p.variants.forEach((v, i) => {
        const row = node('label', v.size + ' · USD'),
          input = node('input');
        input.type = 'number';
        input.required = true;
        input.min = '0';
        input.max = '100000';
        input.step = '0.01';
        input.value = getDraft().prices[p.key]?.[i] ?? v.price;
        input.onchange = () => {
          if (!input.checkValidity()) {
            input.reportValidity();
            return;
          }
          const prices = getDraft().prices[p.key] || p.variants.map((v) => v.price);
          prices[i] = Number(input.value);
          getDraft().prices[p.key] = prices;
          changed();
          refresh();
        };
        row.append(input);
        box.append(row);
      });
    }
    const reset = node('button', 'Restore original prices');
    reset.onclick = () => {
      getDraft().prices = {};
      changed();
      renderPrices();
      refresh();
    };
    box.append(reset);
  }
  $('text-search').oninput = renderTexts;
  $('image-search').oninput = renderImages;
  $('image-scope').onchange = renderImages;
  return {
    render() {
      reviewsEditor.render();
      renderColors();
      renderPrices();
      renderTexts();
      renderImages();
    },
    catalog(message) {
      if (!pages.some(([p]) => p === message.route) || !Array.isArray(message.entries)) return;
      currentRoute = message.route;
      $('page').value = currentRoute;
      catalog = message.entries
        .filter(
          (item) =>
            item &&
            typeof item.original === 'string' &&
            typeof item.section === 'string' &&
            validScope(item.scope)
        )
        .slice(0, 1500);
      currentImages = Array.isArray(message.images)
        ? message.images.filter(
            (i) => i && editableAsset(i.key, data.assets) && typeof i.alt === 'string'
          )
        : [];
      renderTexts();
      renderImages();
    }
  };
}

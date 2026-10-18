const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
const { content, read } = require('./site_source.cjs');
const build = esbuild.buildSync({
  entryPoints: ['src/cms/content.js'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node'
});
const context = vm.createContext({ module: { exports: {} }, exports: {} });
vm.runInContext(build.outputFiles[0].text, context);
const { cleanContent, imageURL, editableText } = context.module.exports;
const assets = content().assets;
const config = JSON.parse(read('src/cms/config.json'));
const good = config.url + '/storage/v1/object/public/website-images/123-abc.png';
assert.equal(imageURL(good, assets), good);
for (const bad of [
  'javascript:alert(1)',
  'https://evil.example/image.png',
  good + '" onerror="alert(1)',
  good + '/../evil.svg',
  'data:image/svg+xml,evil'
])
  assert.equal(imageURL(bad, assets), null);
const edits = cleanContent(
  JSON.parse(
    '{"texts":{"Hello":"<img src=x onerror=alert(1)>","__proto__":"bad"},"images":{"hero-immunity-master-front":null,"nova-emblem":null,"1":"javascript:alert(1)"},"galleries":{"digestive":[{"url":"javascript:alert(1)","alt":"bad","caption":"bad"}]}}'
  ),
  assets
);
assert.equal(
  edits.texts.Hello,
  '<img src=x onerror=alert(1)>',
  'Text stays literal; DOM text nodes render it safely'
);
assert.equal(Object.keys(edits.images).length, 0, 'Hero and logo locked; unsafe URLs rejected');
assert.equal(Object.keys(edits.galleries).length, 0);
assert.equal(Object.hasOwn(edits.texts, '__proto__'), false);
assert.equal(editableText('$30.00'), false);
assert.equal(editableText('120'), false);
assert.equal(editableText('Rooted in nature'), true);
const valid = cleanContent(
  { galleries: { broth: [{ url: good, alt: 'Photo', caption: 'Photo' }] } },
  assets
);
assert.equal(valid.galleries.broth[0].url, good);
assert.equal(cleanContent({ galleries: { broth: [] } }, assets).galleries.broth, undefined);
const expanded = cleanContent(
  {
    pages: {
      '': { Hello: 'Home copy' },
      story: { Hello: 'Story copy' },
      global: { Menu: 'Explore' },
      unknown: { Hello: 'Rejected' }
    },
    colors: {
      paper: '#aAbBcC',
      footerText: '#112233',
      immunityBackground: '#abcdef',
      ink: 'red;}body{display:none}',
      unknown: '#ffffff'
    },
    prices: { digestive: [12.5, 25], immunity: [-1], broth: [Infinity] }
  },
  assets
);
assert.equal(expanded.pages[''].Hello, 'Home copy');
assert.equal(expanded.pages.story.Hello, 'Story copy');
assert.equal(expanded.pages.global.Menu, 'Explore');
assert.equal(expanded.pages.unknown, undefined);
assert.equal(expanded.colors.paper, '#aAbBcC');
assert.equal(expanded.colors.ink, undefined);
assert.equal(expanded.colors.unknown, undefined);
assert.equal(expanded.prices.digestive[0], 12.5);
assert.equal(expanded.prices.immunity, undefined);
assert.equal(expanded.prices.broth, undefined);
for (const invalid of [[1.234], [NaN], ['12'], [100001], [1, 2, 3, 4]])
  assert.equal(
    cleanContent({ prices: { digestive: invalid } }, assets).prices.digestive,
    undefined
  );
assert.equal(
  Object.hasOwn(
    cleanContent(JSON.parse('{"pages":{"story":{"__proto__":"bad","constructor":"bad"}}}'), assets)
      .pages.story,
    '__proto__'
  ),
  false
);
const settingsBuild = esbuild.buildSync({
  entryPoints: ['src/cms/settings.js'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node'
});
const settingsContext = vm.createContext({ module: { exports: {} }, exports: {} });
vm.runInContext(settingsBuild.outputFiles[0].text, settingsContext);
const { pages, colorsCSS, textScope, validScope } = settingsContext.module.exports;
assert.equal(pages.length, 12);
assert.equal(validScope('journal/post'), true);
assert.equal(validScope('__proto__'), false);
assert.equal(colorsCSS({}), '', 'Default appearance stays unchanged');
assert.equal(colorsCSS({ ink: 'red;}body{display:none}' }), '');
assert.match(colorsCSS(expanded.colors), /--paper:#aAbBcC/);
assert.match(colorsCSS(expanded.colors), /\.footer\{color:#112233/);
assert.equal(textScope({ closest: () => null }, 'story'), 'story');
assert.equal(textScope({ closest: () => ({}) }, 'story'), 'global');
const source = read('src/cms/public.js');
// Exercise editor rendering and actions without bypassing production sign-in.
class TestNode {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.value = '';
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.children = nodes;
  }
  setAttribute() {}
  checkValidity() {
    return this.value !== '' && Number(this.value) >= 0;
  }
  reportValidity() {}
}
const controls = new Map();
const control = (id) => {
  if (!controls.has(id)) controls.set(id, new TestNode('div'));
  return controls.get(id);
};
let draft = cleanContent({}, assets),
  changedCount = 0,
  refreshCount = 0,
  selection;
const editorContext = vm.createContext({
  module: { exports: {} },
  exports: {},
  URL,
  location: { href: 'https://example.com/nova/admin/' },
  document: { getElementById: control, createElement: (tag) => new TestNode(tag) }
});
const editorBuild = esbuild.buildSync({
  entryPoints: ['src/cms/editor.js'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node'
});
vm.runInContext(editorBuild.outputFiles[0].text, editorContext);
const editor = editorContext.module.exports.createEditor({
  data: content(),
  getDraft: () => draft,
  changed: () => changedCount++,
  refresh: () => refreshCount++,
  selectText: (...args) => {
    selection = args;
  },
  selectImage: (key) => {
    selection = key;
  }
});
editor.render();
assert.equal(control('page').children.length, 12);
editor.catalog({
  route: 'story',
  entries: [{ original: 'Unique editor fixture', scope: 'story', section: 'Article' }],
  images: []
});
control('text-search').value = 'Unique editor fixture';
control('text-search').oninput();
assert.equal(control('text-list').children.length, 1);
control('text-list').children[0].onclick();
assert.equal(selection[1], 'story');
const colorInput = control('color-list').children[0].children[1].children[0];
colorInput.value = '#123456';
colorInput.onchange();
assert.equal(draft.colors.paper, '#123456');
const priceInput = control('price-list').children[1].children[0];
assert.equal(priceInput.required, true);
priceInput.value = '35.50';
priceInput.onchange();
assert.equal(draft.prices.digestive[0], 35.5);
assert.equal(changedCount, 2);
assert.equal(refreshCount, 2);
control('image-scope').value = 'all';
control('image-scope').onchange();
assert.ok(control('image-list').children.length > 50);
control('image-list').children[0].onclick();
assert.equal(Object.hasOwn(assets, selection), true);
assert.ok(!source.includes('innerHTML'));
assert.match(source, /event\.origin !== location\.origin/);
assert.match(source, /event\.source !== parent/);
assert.match(read('src/cms/admin.js'), /\.eq\('revision',\s*revision\)/);
assert.match(read('backend/schema.sql'), /email_confirmed_at is not null/);
for (const file of ['assets/cms-public.js', 'admin/admin.js']) new vm.Script(read(file));
console.log(
  'PASS: CMS URLs, literal text, 12 page scopes, safe colors, valid prices, unchanged defaults, protected hero/logo, galleries, trusted preview messages, revision guard, verified-email authorization and bundle syntax.'
);

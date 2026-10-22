const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const prettier = require('prettier');
const { root, read, js, css, html, data, content, hash, semanticHash, manifest } = require('./test_helpers.cjs');

(async () => {
  const baseline = JSON.parse(read('tests/fixtures/refactor-baseline.json'));
  const bundled = read('assets/app.js');
  new vm.Script(bundled);
  const withoutCmsHooks = bundled.replace(read('src/scripts/reviews.js'), '').replace('  if (window.NOVA_CMS_GALLERIES?.[p.key]?.length) return window.NOVA_CMS_GALLERIES[p.key];\n', '').replace("photo(items[0].id, items[0].alt, 'id=\"detail-photo\"')", "photo(p.cutout, items[0].alt, 'id=\"detail-photo\"')");
  assert.equal(semanticHash(withoutCmsHooks), baseline.script, 'Original application logic unchanged apart from two explicit CMS gallery hooks');
  assert.equal(semanticHash(bundled), semanticHash("(() => {'use strict';\n" + js + '\n})();'), 'Bundle uses current source files');
  const canonicalCss = await prettier.format(css.replace(read('src/styles/reviews.css'), '').replace(/\/\*[\s\S]*?\*\//g, ''), { parser: 'css' });
  assert.equal(hash(canonicalCss.replace(/\n\s*\n/g, '\n')), baseline.css, 'CSS rules, values and cascade order are unchanged');
  assert.equal(read('assets/site.css'), css, 'Stylesheet is rebuilt from source');
  const canonicalMarkup = await prettier.format(read('src/index.html').replace(/\s*<!-- reviews:start -->[\s\S]*?<!-- reviews:end -->/, '').replace(/\s*<!-- performance:start -->[\s\S]*?<!-- performance:end -->/, '').replace('assets/cms-public.js', 'assets/app.js'), { parser: 'html', htmlWhitespaceSensitivity: 'strict' });
  assert.equal(hash(canonicalMarkup), baseline.markup, 'Page markup is unchanged apart from formatting');
  assert.equal(html, read('src/index.html'), 'HTML build is current');
  const { assets, ...text } = data;
  assert.equal(hash(JSON.stringify(text)), baseline.content, 'Product content and image calibration are unchanged');
  assert.deepEqual(data, content(), 'Data build is current');
  assert.ok(Buffer.byteLength(html) < 50000, 'HTML no longer embeds images or application code');
  assert.ok(!html.includes('data:image/'));
  assert.match(html, /<script defer src="assets\/site-data.js"><\/script>\s*<script defer src="assets\/cms-public.js">/);
  for (const file of [...Object.values(assets), 'assets/app.js', 'assets/site.css', 'assets/site-data.js']) {
    assert.ok(!path.isAbsolute(file) && !file.includes('..'), 'Portable relative asset URL');
    assert.ok(fs.statSync(path.join(root, file)).isFile(), 'Asset exists: ' + file);
  }
  assert.equal(new Set(manifest().scripts).size, manifest().scripts.length, 'No duplicate feature scripts');
  console.log('PASS: unchanged application syntax tree, CSS cascade, markup, content, calibration; current build and all local asset paths.');
})().catch(error => { console.error(error); process.exitCode = 1; });

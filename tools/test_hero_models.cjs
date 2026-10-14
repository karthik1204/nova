const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'site.template.html'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const data = JSON.parse(html.match(/<script[^>]*id="nova-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
let photos = 0;
for (const product of data.products) {
  const model = data.heroModels[product.key];
  assert.equal(model.photos.length, 3);
  for (const name of model.photos) {
    const bytes = fs.readFileSync(path.join(root, 'assets/hero-oct13', name+'.png'));
    assert.equal(model.sourceHashes[name], crypto.createHash('sha256').update(bytes).digest('hex'));
    photos++;
  }
  for (const field of ['texture', 'source', ...(product.key === 'broth' ? ['backTexture', 'sideTexture'] : [])]) {
    assert.ok(model[field].includes('-oct13-'), 'Hero must only reference latest set');
    assert.ok(data.assets[model[field]]?.startsWith('data:image/webp;base64,'));
  }
  if (product.key !== 'broth') {
    assert.equal(model.labelMapping, 'intact-panels-v1', 'Do not blend across label text');
    assert.deepEqual(model.textureSize, [4096, 2048]);
    assert.equal(model.labelPanels.length, 3);
    assert.ok(model.labelPanels.every(p => p.textBlend === 0 && p.padding > 0));
    assert.equal(model.labelPanels.reduce((sum,p) => sum+p.degrees, 0), 360);
    assert.equal(model.profile.length, 321);
    assert.ok(model.profile.every(([r,y]) => r > 0 && Number.isFinite(y)));
    assert.ok(Math.max(...model.profile.map(([r]) => r)) > 1, 'Bottle must retain depth');
  } else {
    assert.equal(model.contour.length, 81);
  }
}
assert.equal(photos, 9);
assert.ok(source.includes('photo(DATA.heroModels[p.key].source'));
assert.ok(source.includes('[side,side,paper,paper,front,back]'));
// Protect the original transition, rotation, speed and interaction behavior.
const original = execFileSync('git', ['show', 'HEAD:site.template.html'], {cwd:root, encoding:'utf8'});
const animation = s => s.slice(s.indexOf('function changeSlide('), s.indexOf('renderRoute(false);init3D();')).replace(/\r\n/g, '\n');
assert.equal(animation(source), animation(original));
console.log('PASS: all 9 October 13 sources verified; new hero/fallback textures; solid bottle depth; front/back/side pouch; original animation unchanged.');

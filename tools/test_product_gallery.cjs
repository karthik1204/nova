const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'site.template.html'), 'utf8');
const data = JSON.parse(html.match(/<script[^>]*id="nova-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
new vm.Script(html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>')));
const context = vm.createContext({products:data.products, asset:id=>data.assets[id], esc:s=>String(s).replace(/"/g,'&quot;'), photo:(id,alt)=>'<img src="'+data.assets[id]+'" alt="'+alt+'">'});
vm.runInContext(source.slice(source.indexOf('function galleryItems('),source.indexOf('document.addEventListener(\'keydown\'',source.indexOf('function galleryItems('))), context);
let sceneCount = 0;
for (const product of data.products) {
  const items = context.galleryItems(product);
  assert.equal(items.length, product.key === 'immunity' ? 6 : 5);
  assert.equal(items[0].id, product.cutout, 'Original packaging must remain first');
  assert.equal(items.filter(item=>item.scene).length, 3);
  for (const item of items) {
    assert.match(data.assets[item.id], /^data:image\/webp;base64,/);
    if (item.scene) {
      sceneCount++;
      assert.ok(item.id.startsWith(product.key+'-scene-'), 'No images from another product');
      assert.match(data.assets[item.id+'-thumb'], /^data:image\/webp;base64,/);
    }
  }
  const markup = context.detailGallery(product);
  assert.equal((markup.match(/data-gallery-photo=/g)||[]).length, items.length);
  assert.ok(markup.includes('View larger'));
  assert.ok(markup.includes('aria-live="polite"'));
  assert.equal((markup.match(/aria-pressed="true"/g)||[]).length, 1);
}
assert.equal(sceneCount, 9);
assert.ok(!source.slice(source.indexOf('function renderHero('),source.indexOf("$('#progress-dots').innerHTML")).includes('-scene-'), 'Hero must not use gallery images');
console.log('PASS: all 9 new images and thumbnails; product matching; original-first order; 3 galleries; selected thumbnails; accessibility markup; JS syntax; hero isolation.');

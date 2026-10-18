const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const { source, data, read, functionSource, assetBytes } = require('./test_helpers.cjs');
new vm.Script(read('assets/app.js'));
const context = vm.createContext({window:{}, products:data.products, asset:id=>data.assets[id], esc:s=>String(s).replace(/"/g,'&quot;'), photo:(id,alt)=>'<img src="'+data.assets[id]+'" alt="'+alt+'">'});
vm.runInContext(['galleryItems','galleryThumbs','detailGallery','selectGalleryPhoto','openProductGallery','stepGallery'].map(functionSource).join('\n'), context);
let sceneCount = 0;
for (const product of data.products) {
  const items = context.galleryItems(product);
  assert.equal(items.length, product.key === 'immunity' ? 6 : 5);
  assert.equal(items[0].id, product.cutout, 'Original packaging must remain first');
  assert.equal(items.filter(item=>item.scene).length, 3);
  for (const item of items) {
    assert.match(data.assets[item.id], /\.webp$/);
    assert.ok(assetBytes(item.id).length > 0);
    if (item.scene) {
      sceneCount++;
      assert.ok(item.id.startsWith(product.key+'-scene-'), 'No images from another product');
      assert.match(data.assets[item.id+'-thumb'], /\.webp$/);
      assert.ok(assetBytes(item.id+'-thumb').length > 0);
    }
  }
  const markup = context.detailGallery(product);
  assert.equal((markup.match(/data-gallery-photo=/g)||[]).length, items.length);
  assert.ok(markup.includes('View larger'));
  assert.ok(markup.includes('aria-live="polite"'));
  assert.equal((markup.match(/aria-pressed="true"/g)||[]).length, 1);
}
assert.equal(sceneCount, 9);
assert.ok(!functionSource('renderHero').includes('-scene-'), 'Hero must not use gallery images');
console.log('PASS: all 9 new images and thumbnails; product matching; original-first order; 3 galleries; selected thumbnails; accessibility markup; JS syntax; hero isolation.');

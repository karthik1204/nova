const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { root, source, data, css, functionSource, ingredientHandler, assetBytes } = require('./test_helpers.cjs');
assert.equal((source.match(/data-image="nova-emblem"/g)||[]).length,2,'Emblem appears in header and footer');
assert.deepEqual(assetBytes('nova-emblem'),fs.readFileSync(path.join(root,'assets/branding/nova-emblem.png')),'Embed the approved logo unchanged');
for(const copy of [
 'A little more Synergy', '#earthmedicine', 'Potent herbal remedies',
 'A look inside The Alchemist’s Kitchen', 'The real people, plants and process behind every bottle</p>',
 'Explore our small-batch herbal tonics and nourishing broth kit.',
 'More from the kitchen', 'Inside our standard', 'From the archive', 'Research in every formulation.',
 'ingredient notes behind every formulation.', 'Ingredient Notes',
 'New product launches, courses and other updates.</p>', '>Contact Us</a>',
 'Meet the heart behind Nova Health Synergy', '<p class="signature">Necia Chavis</p><p class="founder-role">Owner &amp; Founder</p>',
 'Our vision is to integrate', 'Notes from Nova Health Synergy',
 'Follow us for new product launches', '<span>Handcrafted in small batches with love, respect and diligence.</span>'
]) assert.ok(source.replace(/\s+/g,'').includes(copy.replace(/\s+/g,'')), 'Missing feedback: '+copy);
for(const removed of ['The Nova collection','<div class="ingredient-tags">','Nova’s ingredient notes','ingredient guide on Nova’s official website.',
 'Take a closer look at the preparation, infusion and bottling in Nova’s own kitchen.']) assert.ok(!source.includes(removed), 'Old content remains: '+removed);
const tickers=[...source.matchAll(/<div\s+class="ticker-group"[^>]*>(.*?)<\/div\s*>/gs)].map(m=>m[1].replace(/\s+aria-hidden="true"/g,'').replace(/\s+/g,''));
assert.equal(tickers.length,2);
assert.equal(tickers[0],tickers[1],'Ticker halves stay identical for seamless looping');
assert.ok(css.replace(/\s+/g,'').includes('.process.section-heading>p{font-size:clamp(17px,1.4vw,21px)'));
assert.ok(css.replace(/\s+/g,'').includes('.process.section-heading.eyebrow{color:#000;opacity:1'));
assert.ok(css.replace(/\s+/g,'').includes('.process.section-headingh2em{color:#626e42;'));
const context=vm.createContext({selectedSizes:[0,0,0],photo:(_id,alt)=>'<img alt="'+alt+'">',galleryItems:p=>p.ingredients,esc:String});
vm.runInContext(functionSource('productCard'),context);
const captions={digestive:'Gut Healer. Deeply Soothing. Rapid Relief.',immunity:'Fire Cider. Virus Killer. Rapid Relief.',broth:'Nourishing. Immune-Boosting. Rejuvenating.'};
for(const [i,p]of data.products.entries()){
 const card=context.productCard(p,i);
 assert.ok(card.includes('<p class="card-kicker">'+captions[p.key]+'</p>'));
 assert.ok(card.includes('data-add-bag="'+i+'"'));
 assert.ok(card.includes('data-open-product-gallery="'+i+'"'));
 assert.ok(!card.includes('The Nova collection'));
}
const ingredientLine=ingredientHandler();
for(const [i,p]of data.products.entries()){
 for(const [j,ing]of p.ingredients.entries()){
  const content={innerHTML:''};let opened=false;
  const ctx=vm.createContext({button:{dataset:{ingredient:i+':'+j}},products:data.products,photo:()=>'<img>',esc:String,$:id=>id==='#ingredient-dialog-content'?content:{showModal(){opened=true;}}});
  vm.runInContext(ingredientLine,ctx);
  assert.ok(opened);
  assert.ok(content.innerHTML.includes('Ingredient Notes'));
  assert.ok(content.innerHTML.includes(ing.name));
  assert.ok(content.innerHTML.includes('<small>These statements have not been evaluated by the FDA.</small>'));
  assert.ok(!content.innerHTML.includes('Nova’s'));
 }
}
console.log('PASS: document copy and scoped styling; 3 product cards; all 60 ingredient popups; ticker loop; current logo, content and interactions.');


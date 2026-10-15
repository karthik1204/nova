const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'site.template.html'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const data = JSON.parse(html.match(/<script[^>]*id="nova-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const builtTemplate = html.replace(/\r\n/g, '\n').replace(/(<script[^>]*id="nova-data"[^>]*>)[\s\S]*?(<\/script>)/, '$1__NOVA_CONTENT__$2');
assert.ok(builtTemplate.trimEnd() === source.trimEnd(), 'Preview is assembled from the current template');
function fingerprint(s) { let h=2166136261; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619); return [s.length,h>>>0]; }
const protectedRegions = [
  {
    "name": "hero markup",
    "start": "<section class=\"hero\"",
    "end": "</section>",
    "expected": [
      1244,
      2593147072
    ]
  },
  {
    "name": "hero rendering",
    "start": "function renderHero(",
    "end": "$('#progress-dots').innerHTML",
    "expected": [
      1339,
      199049808
    ]
  },
  {
    "name": "animation",
    "start": "function changeSlide(",
    "end": "renderRoute(false);init3D();",
    "expected": [
      2240,
      1560716724
    ]
  },
  {
    "name": "header",
    "start": "<header",
    "end": "</header>",
    "expected": [
      1091,
      2813444269
    ]
  }
];
for(const r of protectedRegions){
 const a=source.indexOf(r.start), b=source.indexOf(r.end,a);
 assert.ok(a>=0 && b>a, r.name);
 let region=source.slice(a,b+r.end.length);
 // The Oct 15 logo replacement is authorized; keep the rest of the header protected.
 if(r.name==='header') region=region.replace("<img class=\"brand-symbol brand-emblem\" data-image=\"nova-emblem\" width=\"44\" height=\"44\" alt=\"\" aria-hidden=\"true\">","<svg class=\"brand-symbol\" viewBox=\"0 0 42 48\" aria-hidden=\"true\"><path d=\"M21 3v42M21 10C12 3 5 6 7 17c1 7 8 9 14 13M21 10c9-7 16-4 14 7-1 7-8 9-14 13M21 21C10 12 3 23 9 33c3 6 9 9 12 12M21 21c11-9 18 2 12 12-3 6-9 9-12 12\"/></svg>");
 assert.deepEqual(fingerprint(region),r.expected,r.name+' must match the pre-feedback version (except the approved emblem)');
}
assert.equal((source.match(/data-image="nova-emblem"/g)||[]).length,2,'Emblem appears in header and footer');
assert.deepEqual(Buffer.from(data.assets['nova-emblem'].split(',')[1],'base64'),fs.readFileSync(path.join(root,'assets/branding/nova-emblem.png')),'Embed the approved logo unchanged');
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
]) assert.ok(source.includes(copy), 'Missing feedback: '+copy);
for(const removed of ['The Nova collection','<div class="ingredient-tags">','Nova’s ingredient notes','ingredient guide on Nova’s official website.',
 'Take a closer look at the preparation, infusion and bottling in Nova’s own kitchen.']) assert.ok(!source.includes(removed), 'Old content remains: '+removed);
const tickers=[...source.matchAll(/<div class="ticker-group"[^>]*>(.*?)<\/div>/g)].map(m=>m[1].replace(/ aria-hidden="true"/g,''));
assert.equal(tickers.length,2);
assert.equal(tickers[0],tickers[1],'Ticker halves stay identical for seamless looping');
assert.match(source,/\.process \.section-heading>p\{font-size:clamp\(17px,1.4vw,21px\)/);
assert.match(source,/\.process \.section-heading \.eyebrow\{color:#000;opacity:1/);
assert.match(source,/\.process \.section-heading h2 em\{color:#626e42\}/);
const context=vm.createContext({selectedSizes:[0,0,0],photo:(_id,alt)=>'<img alt="'+alt+'">',galleryItems:p=>p.ingredients,esc:String});
vm.runInContext(source.slice(source.indexOf('function productCard('),source.indexOf('function cards(')),context);
const captions={digestive:'Gut Healer. Deeply Soothing. Rapid Relief.',immunity:'Fire Cider. Virus Killer. Rapid Relief.',broth:'Nourishing. Immune-Boosting. Rejuvenating.'};
for(const [i,p]of data.products.entries()){
 const card=context.productCard(p,i);
 assert.ok(card.includes('<p class="card-kicker">'+captions[p.key]+'</p>'));
 assert.ok(card.includes('data-add-bag="'+i+'"'));
 assert.ok(card.includes('data-open-product-gallery="'+i+'"'));
 assert.ok(!card.includes('The Nova collection'));
}
const ingredientLine=source.split('\n').find(l=>l.trimStart().startsWith('if(button.dataset.ingredient)'));
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
console.log('PASS: document copy and scoped styling; 3 product cards; all 60 ingredient popups; ticker loop; untouched header/hero/animation; current preview build.');


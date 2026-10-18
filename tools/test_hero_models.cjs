const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { root, source, data, css, functionSource, assetBytes } = require('./test_helpers.cjs');
let photos = 0;
for (const product of data.products) {
  const model = data.heroModels[product.key];
  const views = data.heroPhotos[product.key];
  assert.equal(views.length, 3);
  const names = product.key === 'broth' ? ['front','side','back'] : ['front','back','nutrition'];
  for (const [i, view] of views.entries()) {
    const bytes = fs.readFileSync(product.key==='immunity' && i===0
      ? path.join(root,'assets/hero-masters/immunity-front.png')
      : path.join(root, 'assets/hero-oct14', product.key+'-'+names[i]+'.png'));
    assert.ok(data.assets[view.asset].endsWith('.png'));
    const embedded = assetBytes(view.asset);
    assert.equal(crypto.createHash('sha256').update(embedded).digest('hex'), crypto.createHash('sha256').update(bytes).digest('hex'), 'Display original PNG bytes without label edits');
    assert.equal(view.width, bytes.readUInt32BE(16));
    assert.equal(view.height, bytes.readUInt32BE(20));
    assert.ok(view.bounds[2] > view.bounds[0] && view.bounds[3] > view.bounds[1]);
    photos++;
  }
  assert.equal(model.source, views[0].asset, 'Fallback must also show the latest front photo');
}
assert.equal(photos, 9);
assert.match(functionSource('renderHero'), /photo\(DATA\.heroModels\[p\.key\]\.source/);
assert.ok(source.includes('function renderProductPhotos('), 'Use rigid photographic layers, not projected labels');
assert.ok(!source.includes('new T.LatheGeometry'), 'Do not wrap supplied photographs onto geometry');
// Full controller equivalence is checked against the pre-refactor syntax tree in test_structure.cjs.
const adapter = ['photoExitPose','photoVector','init3D','renderProductPhotos','resize'].map(functionSource).join('\n');
assert.ok(source.includes('function photoExitPose('), 'Exit uses a continuous overlap, not hard angle swaps');
assert.ok(!/scaleX|scaleY|rotateY|perspective|skew|new T\./.test(adapter));
assert.ok(css.replace(/\s+/g,'').includes('object-fit:contain;object-position:centercenter;transform-origin:centercenter'));
assert.ok(adapter.includes('ready.push(img.decode())'), 'Predecode every view to prevent blank frame swaps');
// Exercise the actual unchanged controller at 120 frames/sec in both directions.
const vm = require('node:vm');
let checkedFrames = 0;
for (const width of [390, 1440]) {
  const context = {
    models: [], modelRoot: {unit: width === 390 ? 48 : 85},
    selected: 0, transition: null, pending: null, reduced: false, modelsReady: true,
    playing: false, homeActive: true, heroVisible: true, previousFrame: 0,
    elapsed: 0, lastAdvance: 0, transitionDuration: 1000, slideDuration: 2000,
    document: {hidden: false}, performance: {now: () => 0},
    requestAnimationFrame: () => 0, renderHero: () => {}, resize: () => {},
    $$: () => [], renderer: null, camera: {}, scene: {}, pointer: {x:0,y:0}
  };
  vm.createContext(context);
  vm.runInContext(['photoExitPose','photoVector','renderProductPhotos','ease','changeSlide','frame'].map(functionSource).join('\n'), context);
  context.models = data.products.map(p => ({key:p.key, element:{style:{}},
    views:data.heroPhotos[p.key].map(spec => ({spec,element:{style:{}}})),
    position:context.photoVector(), rotation:context.photoVector(),
    scale:{value:1,setScalar(v){this.value=v;}}}));
  context.renderer = {render:context.renderProductPhotos};
  for (const direction of [1,-1]) {
    for (let from=0; from<3; from++) {
      context.selected=from;
      context.models.forEach((m,i)=>{m.visible=i===from;m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.setScalar(1);});
      context.changeSlide((from+1)%3,false,direction);
      let previousWeights=[1,0,0], previousOpacity=1;
      let blendedFrames=0;
      for (let frame=0;frame<=120;frame++) {
        context.frame(frame*1000/120);
        const visible=context.models.filter(m=>!m.element.hidden);
        assert.equal(visible.length,frame===120?1:2,'Outgoing and incoming photographs remain independent');
        for(const m of visible){
          assert.match(m.element.style.transform,/^translate\([-\d.e+]+px,[-\d.e+]+px\) scale\([\d.e+]+\)$/);
          assert.ok(m.scale.value>=.6 && m.scale.value<=1);
          const weights=m.views.map(v=>v.element.hidden?0:Number(v.element.style.opacity));
          assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-9, 'No empty frame during overlap');
          assert.ok(weights.every(w=>w>=0&&w<=1));
          if(m.key==='broth')assert.equal(weights[1],0,'Never use the edge-on pouch photograph, even with noisy alpha bounds');
          if(m.key!=='broth'){
            assert.deepEqual(weights,[1,0,0],'Bottles use only their exact front master throughout exit');
            assert.equal(Number(m.element.style.opacity),1,'No bottle opacity fade or background tint');
          }else if(m===context.models[from] && frame<120){
            weights.forEach((w,i)=>assert.ok(Math.abs(w-previousWeights[i])<.09,'No sudden angle switch'));
            const opacity=Number(m.element.style.opacity);
            assert.ok(opacity<=previousOpacity+1e-9 && Math.abs(opacity-previousOpacity)<.09, 'Continuous exit fade');
            if(frame<=94)assert.equal(opacity,1,'Fade only near the end');
            if(weights.filter(w=>w>0).length===2)blendedFrames++;
            if(Math.abs(m.position.x)<.64)assert.equal(weights[0],1,'Stay front-facing near center');
            const ratio=v=>(v.spec.bounds[2]-v.spec.bounds[0])/(v.spec.bounds[3]-v.spec.bounds[1]);
            m.views.forEach((v,i)=>{if(weights[i]>0)assert.ok(ratio(v)/ratio(m.views[0])>=.75,'Never display a razor-thin angle');});
            previousWeights=weights;previousOpacity=opacity;
          }else{
            assert.equal(weights[0],1,'Incoming and resting product remain front-facing');
            assert.equal(Number(m.element.style.opacity),1);
          }
        }
        checkedFrames++;
      }
      if(context.models[from].key==='broth')assert.ok(blendedFrames>=30,'Pouch angle change must overlap gently across many frames');
    }
  }
}
console.log('PASS: '+checkedFrames+' desktop/mobile transition frames; independent layers; uniform scaling only; no empty views.');
assert.equal(data.heroPhotos.immunity[0].asset,'hero-immunity-master-front');
console.log('PASS: all 9 PNGs referenced without changes, including approved Immunity front master; bottle color protected; original animation controller unchanged.');

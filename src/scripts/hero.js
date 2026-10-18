/* Rigid photographs: preserve the existing animation state, never project or warp a PNG. */
function photoExitPose(m) {
  const weights = m.views.map((_, i) => (i === 0 ? 1 : 0));
  // Exact-appearance mode: the bottle master stays intact and fully opaque.
  // Existing translation/uniform scale supply motion; mismatched back views
  // and opacity fades must not change the glass or let the background tint it.
  if (m.key === 'immunity' || m.key === 'digestive') return { weights, opacity: 1 };
  if (!transition || transition.solo || m !== models[transition.old])
    return { weights, opacity: 1 };
  const progress = Math.min(1, Math.abs(m.position.x) / 8);
  const smooth = (value) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  const footprint = (view) => {
    const b = view.spec.bounds;
    return (b[2] - b[0]) / (b[3] - b[1]);
  };
  const frontWidth = footprint(m.views[0]);
  // Do not stretch a narrow side photograph to manufacture a usable angle.
  // If no broad angle exists, retain the front and use the smooth slide/fade.
  // The supplied pouch side view is edge-on; stray edge pixels make its alpha
  // bounds wider than the actual pouch, so exclude it explicitly as well.
  const order = m.key === 'broth' ? [2] : transition.direction < 0 ? [2, 1] : [1, 2];
  const next = order.find((i) => m.views[i] && footprint(m.views[i]) / frontWidth >= 0.75);
  if (next !== undefined) {
    const blend = smooth((progress - 0.08) / 0.84);
    weights[0] = 1 - blend;
    weights[next] = blend;
  }
  // Recover elapsed progress from the unchanged cubic movement easing so the
  // end fade stays gentle rather than accelerating with the exit displacement.
  const time = progress < 0.5 ? Math.cbrt(progress / 4) : 1 - Math.cbrt((1 - progress) / 4);
  return { weights, opacity: 1 - smooth((time - 0.8) / 0.2) };
}
function photoVector() {
  return {
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  };
}
function init3D() {
  // Keep the existing transition controller; blend intact views only on exit.
  // The numeric rotation clock is NEVER applied as an image transform.
  const stage = document.createElement('div');
  stage.className = 'product-image-stage';
  $('#hero-canvas').replaceChildren(stage);
  const ready = [];
  models = products.map((p, i) => {
    const layer = document.createElement('div');
    layer.className = 'product-image-layer';
    layer.dataset.product = p.key;
    const views = DATA.heroPhotos[p.key].map((spec, j) => {
      const view = document.createElement('div');
      view.className = 'product-photo-view';
      view.hidden = j !== 0;
      const img = document.createElement('img');
      img.className = 'product-image';
      img.alt = '';
      img.draggable = false;
      img.src = asset(spec.asset);
      img.width = spec.width;
      img.height = spec.height;
      img.decoding = 'async';
      view.append(img);
      layer.append(view);
      ready.push(img.decode());
      return { element: view, image: img, spec };
    });
    stage.append(layer);
    return {
      key: p.key,
      element: layer,
      views,
      visible: i === selected,
      position: photoVector(),
      rotation: photoVector(),
      scale: {
        value: 1,
        setScalar(value) {
          this.value = value;
        }
      }
    };
  });
  const shadow = document.createElement('div');
  shadow.className = 'product-stage-shadow';
  stage.prepend(shadow);
  modelRoot = { stage, shadow, unit: 1 };
  camera = {};
  renderer = { render: renderProductPhotos };
  resize();
  Promise.all(ready)
    .then(() => {
      modelsReady = true;
      $('#hero-fallback').hidden = true;
      models.forEach((m, i) => (m.visible = i === selected));
      lastAdvance = performance.now();
      resize();
    })
    .catch((error) => {
      console.warn(
        'Product photographs could not load; keeping the supplied front photograph.',
        error
      );
      $('#hero-canvas').hidden = true;
    });
}
function renderProductPhotos() {
  if (!modelRoot) return;
  for (const m of models) {
    m.element.hidden = !m.visible;
    // Translation and ONE scale value are the only animated CSS transforms.
    m.element.style.transform =
      'translate(' +
      m.position.x * modelRoot.unit +
      'px,' +
      -m.position.y * modelRoot.unit +
      'px) scale(' +
      m.scale.value +
      ')';
    const pose = photoExitPose(m);
    m.element.style.opacity = pose.opacity;
    m.views.forEach((view, j) => {
      view.element.style.opacity = pose.weights[j];
      view.element.hidden = pose.weights[j] === 0;
    });
  }
}
function resize() {
  if (!renderer || !homeActive) return;
  const r = hero.getBoundingClientRect(),
    a = $('#hero-anchor').getBoundingClientRect();
  if (!r.width || !r.height) return;
  const worldH = 32 * Math.tan((16 * Math.PI) / 180);
  const availableHeight = Math.min(a.height * 0.92, window.innerWidth < 761 ? 350 : 670);
  // Same old camera framing, stage center and travel distance in screen pixels.
  // Reserve space for the entire PNG, including transparent margins.
  const widest = Math.max(
    ...models.flatMap((m) =>
      m.views.map(
        (v) =>
          (DATA.heroModels[m.key].height * v.spec.width) / (v.spec.bounds[3] - v.spec.bounds[1])
      )
    )
  );
  const unit = Math.min(availableHeight / 6.6, (a.width * 0.96) / widest);
  const stage = modelRoot.stage;
  modelRoot.unit = unit;
  stage.style.left = a.left - r.left + 'px';
  stage.style.top = a.top - r.top + (0.05 * r.height) / worldH + 'px';
  stage.style.width = a.width + 'px';
  stage.style.height = a.height + 'px';
  for (const m of models) {
    for (const view of m.views) {
      const s = view.spec,
        [left, top, right, bottom] = s.bounds;
      const fit = Math.min(a.width / s.width, a.height / s.height);
      const gain = (unit * DATA.heroModels[m.key].height) / ((bottom - top) * fit);
      const dx = (s.width / 2 - (left + right) / 2) * fit * gain;
      const dy = (s.height / 2 - (top + bottom) / 2) * fit * gain;
      // Constant per-view calibration, recalculated ONLY on viewport resize.
      // All original pixels remain present; both axes receive the same gain.
      view.element.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + gain + ')';
    }
  }
  const shadow = modelRoot.shadow;
  shadow.style.width = 4.8 * unit + 'px';
  shadow.style.height = unit + 'px';
  shadow.style.left = a.width / 2 - 2.4 * unit + 'px';
  shadow.style.top = a.height / 2 + 3 * unit + 'px';
  renderProductPhotos();
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe($('#hero-anchor'));
function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function changeSlide(index, forceSpin = false, direction = 1) {
  if (transition) {
    pending = { index, forceSpin, direction };
    return;
  }
  const old = selected;
  if (index === selected && !forceSpin) return;
  selected = index;
  lastAdvance = performance.now();
  renderHero(true);
  requestAnimationFrame(resize);
  if (reduced || !modelsReady) {
    models.forEach((m, i) => {
      m.visible = i === selected;
      m.position.set(0, 0, 0);
      m.rotation.set(0, 0, 0);
      m.scale.setScalar(1);
    });
    return;
  }
  const from = models[old],
    to = models[index];
  to.visible = true;
  if (index === old) {
    transition = {
      start: performance.now(),
      old,
      index,
      direction,
      solo: true,
      angle: to.rotation.y
    };
    return;
  }
  transition = { start: performance.now(), old, index, direction, fromAngle: from.rotation.y };
  to.rotation.set(0, -direction * Math.PI * 2, 0);
  to.position.set(direction * 8, 0, 0);
  to.scale.setScalar(0.6);
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min((now - previousFrame) / 1000, 0.045);
  previousFrame = now;
  if (document.hidden || !homeActive || !heroVisible) return;
  if (transition && modelsReady) {
    const t = Math.min(1, (now - transition.start) / transitionDuration),
      e = ease(t),
      from = models[transition.old],
      to = models[transition.index],
      d = transition.direction;
    if (transition.solo) to.rotation.y = transition.angle + 2 * Math.PI * e;
    else {
      from.position.x = -d * 8 * e;
      from.rotation.y = transition.fromAngle + d * Math.PI * 2 * e;
      from.scale.setScalar(1 - 0.4 * e);
      to.position.x = d * 8 * (1 - e);
      to.rotation.y = -d * Math.PI * 2 * (1 - e);
      to.scale.setScalar(0.6 + 0.4 * e);
    }
    if (t === 1) {
      models.forEach((m, i) => {
        m.visible = i === selected;
        m.position.set(0, 0, 0);
        m.rotation.set(0, 0, 0);
        m.scale.setScalar(1);
      });
      transition = null;
      if (pending) {
        const q = pending;
        pending = null;
        changeSlide(q.index, q.forceSpin, q.direction);
      }
    }
  } else if (modelsReady && !reduced && playing) {
    elapsed += dt;
    const m = models[selected];
    m.rotation.y += dt * 0.11;
    m.rotation.x += (pointer.y * 0.09 - m.rotation.x) * 0.055;
    m.rotation.z += (-pointer.x * 0.09 - m.rotation.z) * 0.055;
    m.position.y = Math.sin(elapsed * 1.5) * 0.065;
  }
  if (!playing) lastAdvance += dt * 1000;
  if (!transition && playing && !reduced && now - lastAdvance >= slideDuration)
    changeSlide((selected + 1) % 3);
  $$('.progress-track i').forEach(
    (el, i) =>
      (el.style.width =
        i === selected
          ? (reduced ? '100' : Math.min(100, ((now - lastAdvance) / slideDuration) * 100)) + '%'
          : '0%')
  );
  if (renderer && camera) renderer.render(scene, camera);
}

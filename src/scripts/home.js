function renderHero(announce = false) {
  const p = products[selected],
    v = p.variants[selectedSizes[selected]],
    parts = p.name.split(' ');
  $('#hero-copy').innerHTML = products
    .map(
      (item, i) =>
        '<article class="hero-content" ' +
        (i !== selected ? 'hidden inert aria-hidden="true"' : 'aria-hidden="false"') +
        '>' +
        (i === selected
          ? '<p class="eyebrow">' +
            p.tag +
            '</p><h1>' +
            parts[0] +
            ' <br><em>' +
            parts.slice(1).join(' ') +
            '.</em></h1><p class="description">' +
            p.short +
            '</p>' +
            sizeButtons(p, selected, 'hero') +
            '<div class="hero-buy"><button class="pill" data-add-bag="' +
            selected +
            '" aria-label="Add ' +
            p.name +
            ' to bag">Add to bag</button><span class="hero-price">$' +
            v.price.toFixed(2) +
            '<small>' +
            esc(v.size) +
            ' · USD</small></span></div>'
          : '') +
        '</article>'
    )
    .join('');
  hero.style.setProperty('--hero', p.color);
  $('#hero-ghost').textContent = ['feel good.', 'stay rooted.', 'sip slowly.'][selected];
  $('#slide-count').textContent = '0' + (selected + 1) + ' / 03';
  $$('.progress-dot').forEach((b, i) => b.setAttribute('aria-current', String(i === selected)));
  const botIds = [
    ['41', '38'],
    ['63', '72'],
    ['18', '26']
  ][selected];
  $$('.hero-botanical').forEach((im, i) => (im.src = asset(botIds[i] + '-botanical')));
  if (announce) $('#slide-announcement').textContent = p.name + ', ' + v.size + ', $' + v.price;
  if (!modelsReady) $('#hero-fallback').innerHTML = photo(DATA.heroModels[p.key].source, '');
}
$('#progress-dots').innerHTML = products
  .map(
    (p, i) =>
      '<button class="progress-dot" data-slide="' +
      i +
      '" aria-current="' +
      (i === 0) +
      '" aria-label="Show ' +
      p.name +
      '"><span class="progress-track"><i></i></span><span class="product-label">' +
      p.name +
      '</span></button>'
  )
  .join('');
$('#home-products').innerHTML = cards();
$('#behind-scenes').innerHTML = ['01', '02', '03', '04', '06', '08', '09', '10']
  .map(
    (id, i) =>
      '<button data-lightbox="' +
      id +
      '" aria-label="Open Nova kitchen photo ' +
      (i + 1) +
      '">' +
      photo(
        id,
        [
          'Citrus and jars prepared for an infusion',
          'Herbs steeping in glass jars',
          'A freshly prepared batch of tonic',
          'Botanical ingredients ready for blending',
          'Roots and herbs in the Nova kitchen',
          'Hand bottling Nova tonic',
          'An earlier Nova tonic bottle',
          'Nova Immunity Tonic product photograph'
        ][i],
        'loading="lazy"'
      ) +
      '</button>'
  )
  .join('');
$('#year').textContent = new Date().getFullYear();
hydrate();
renderHero();
const standardEntries = [
  {
    image: '06',
    alt: 'Roots and herbs selected for Nova formulations',
    caption: 'It begins with the plants.',
    copy: 'Organic and wildcrafted ingredients, selected with care and intention. It starts with the roots, leaves and botanicals that go into each Nova formulation.',
    link: '#/ingredients',
    label: 'Meet the ingredients'
  },
  {
    image: '02',
    alt: 'Botanicals slowly infusing in jars in the Nova kitchen',
    caption: 'Research in every formulation.',
    copy: 'Ingredients backed by scientific research and years of traditional knowledge. Nova brings Necia’s chemical engineering background together with her continuing study of herbalism.',
    link: '#/story',
    label: 'Meet the formulator'
  },
  {
    image: '13',
    alt: 'Necia Chavis outdoors in North Carolina',
    caption: 'A connection that runs deep.',
    copy: 'Necia’s Lumbee heritage and connection to the land and the Lumber River are part of Nova’s foundation. Plant traditions are held with respect for the people and places behind them.',
    link: '#/story',
    label: 'Read Necia’s story'
  },
  {
    image: '08',
    alt: 'Nova tonic being strained and bottled by hand',
    caption: 'Made by hand. Made with care.',
    copy: 'Handcrafted in small batches with love, respect and diligence.',
    link: '#kitchen',
    label: 'Step inside the kitchen'
  }
];
function selectStandard(index) {
  const item = standardEntries[index];
  $$('[data-standard]').forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
  });
  $('#standard-panel').setAttribute('aria-labelledby', 'standard-tab-' + index);
  $('#standard-detail').textContent = item.copy;
  $('#standard-photo').src = asset(item.image);
  $('#standard-photo').alt = item.alt;
  $('#standard-caption').textContent = item.caption;
  $('#standard-number').textContent = '0' + (index + 1) + ' / 04';
  $('#standard-link').href = item.link;
  $('#standard-link').innerHTML = item.label;
}
$$('[data-standard]').forEach((tab, i) => {
  tab.addEventListener('click', () => selectStandard(i));
  tab.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let next = i;
    if (e.key === 'ArrowDown') next = (i + 1) % 4;
    else if (e.key === 'ArrowUp') next = (i + 3) % 4;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 3;
    else return;
    e.preventDefault();
    selectStandard(next);
    $('#standard-tab-' + next).focus();
  });
});
$('.ticker-pause').addEventListener('click', () => {
  const paused = $('.ticker').classList.toggle('is-paused'),
    control = $('.ticker-pause');
  control.setAttribute('aria-pressed', String(paused));
  control.setAttribute(
    'aria-label',
    paused ? 'Play scrolling commitments' : 'Pause scrolling commitments'
  );
  control.textContent = paused ? '▷' : 'Ⅱ';
});
function setPauseUI() {
  $('#pause').setAttribute('aria-pressed', String(!playing));
  $('#pause').setAttribute(
    'aria-label',
    playing ? 'Pause automatic rotation' : 'Play automatic rotation'
  );
  $('#pause-text').textContent = playing ? 'Pause' : 'Play';
  $('#pause').firstElementChild.textContent = playing ? 'Ⅱ' : '▷';
}
setPauseUI();
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('seen');
        observer.unobserve(e.target);
      }
    }),
  { threshold: 0.08 }
);
function observe() {
  if (!reduced) document.documentElement.classList.add('js-motion');
  $$('.reveal').forEach((el) => observer.observe(el));
}
observe();

function library(p, index) {
  return (
    '<p class="ingredient-count">' +
    p.ingredients.length +
    ' botanicals in ' +
    p.name +
    '</p><div class="ingredient-grid">' +
    p.ingredients
      .map(
        (ing, j) =>
          '<button class="ingredient-card reveal" data-ingredient="' +
          index +
          ':' +
          j +
          '"><div class="image-wrap">' +
          photo(ing.image, ing.name + ' botanical illustration', 'loading="lazy"') +
          '</div><span>' +
          esc(ing.name) +
          ' <b>↗</b></span></button>'
      )
      .join('') +
    '</div>'
  );
}
function detail(p) {
  const i = products.indexOf(p),
    v = p.variants[selectedSizes[i]];
  return (
    '<section class="product-page"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/shop">The apothecary</a><span>/</span><span>' +
    p.name +
    '</span></nav><div class="detail-grid">' +
    detailGallery(p) +
    '<div class="detail-copy"><p class="eyebrow">The alchemist’s apothecary</p><h1>' +
    p.name.replace(' ', '<br><em>') +
    '</em></h1><p class="detail-description">' +
    esc(p.description) +
    '</p><p class="detail-price" id="detail-price">$' +
    v.price.toFixed(2) +
    '</p>' +
    sizeButtons(p, i, 'detail') +
    '<button class="pill" data-add-bag="' +
    i +
    '" aria-label="Add ' +
    p.name +
    ' to bag">Add to bag</button><p class="checkout-note">Keep your favorites together. Online checkout coming soon.</p><div class="detail-meta"><span>Handcrafted in small batches</span><span>Organic & wildcrafted ingredients</span></div></div></div></section><section class="section ingredients-section"><div class="section-heading"><div><p class="eyebrow">Inside the formulation</p><h2>Get to know<br>your <em>botanicals.</em></h2></div><p>Explore the original ingredient illustrations and notes from our apothecary.</p></div>' +
    library(p, i) +
    '</section><section class="section shop-section"><div class="section-heading"><h2>There’s more to <em>explore.</em></h2></div><div class="product-grid">' +
    cards(products.filter((x) => x !== p)) +
    '</div></section>'
  );
}
function renderRoute(scroll = true) {
  const path = location.hash.startsWith('#/') ? location.hash.slice(2) : '';
  homeActive = !path;
  home.hidden = !homeActive;
  page.hidden = homeActive;
  $('#header').classList.toggle('inner', !homeActive);
  if (homeActive) {
    document.title = 'Nova Health Synergy · The infusion of science and nature';
    page.innerHTML = '';
    lastAdvance = performance.now();
    requestAnimationFrame(resize);
  } else {
    const part = path.split('/'),
      p = products.find((x) => x.key === part[1]);
    if (part[0] === 'product' && p) {
      page.innerHTML = detail(p);
      document.title = p.name + ' · Nova Health Synergy';
    } else if (path === 'shop') {
      page.innerHTML =
        '<section class="inner-hero"><p class="eyebrow">The alchemist’s apothecary</p><h1>Your next<br><em>good ritual.</em></h1><p>Explore our small-batch herbal tonics and nourishing broth kit.</p></section><section class="section shop-page"><div class="filter-tabs" aria-label="Filter products"><button data-filter="all" aria-pressed="true">All remedies</button><button data-filter="tonic" aria-pressed="false">Herbal tonics</button><button data-filter="broth" aria-pressed="false">Broth kit</button></div><div class="product-grid" id="shop-grid">' +
        cards() +
        '</div></section>';
      document.title = 'Shop the apothecary · Nova Health Synergy';
    } else if (path === 'ingredients') {
      page.innerHTML =
        '<section class="inner-hero"><p class="eyebrow">The botanical library</p><h1>From the earth.<br><em>Full of possibility.</em></h1><p>The original botanical illustrations and ingredient notes behind every formulation. Select a product, then a plant to explore.</p></section><section class="section" style="padding-top:0"><div class="filter-tabs" aria-label="Choose ingredient collection">' +
        products
          .map(
            (p, i) =>
              '<button data-library="' +
              i +
              '" aria-pressed="' +
              (i === 0) +
              '">' +
              p.name +
              '</button>'
          )
          .join('') +
        '</div><div id="library-grid">' +
        library(products[0], 0) +
        '</div></section>';
      document.title = 'The botanical library · Nova Health Synergy';
    } else if (path === 'story') {
      page.innerHTML =
        '<section class="section story-page-header">' +
        photo('13', 'Necia Chavis outdoors in North Carolina') +
        '<div><p class="eyebrow">Owner & founder · Necia Chavis</p><h1>A life of learning.<br>A calling to<br><em>care.</em></h1><p>Engineer. #EarthMedicine maker. Educator.<br>Rooted in the Lumbee Tribe of North Carolina.</p></div></section><section class="section story-article"><aside><p class="name">Necia’s story</p><p>In her own words.</p><a class="text-link" href="#/contact">Say hello ↗</a></aside><article class="story-body">' +
        DATA.story.map((p) => '<p>' + esc(p) + '</p>').join('') +
        '</article></section>';
      document.title = 'Necia’s story · Nova Health Synergy';
    } else if (path === 'contact') {
      page.innerHTML =
        '<section class="section contact-layout"><div><p class="eyebrow">Let’s connect</p><h1>A conversation<br>starts with<br><em>hello.</em></h1><p>“Please feel free to contact me to say hello or speak with me about herbs and healing!”</p><p>— Necia</p><div class="contact-actions"><p class="connection-note">Our new contact form is not available yet. In the meantime, you can find Nova Health Synergy on Facebook.</p><a class="pill" href="https://www.facebook.com/NovaHealthSynergy/" target="_blank" rel="noopener">Visit Nova on Facebook ↗</a></div></div>' +
        photo('14', 'Woven basket, dried corn and traditional objects photographed by Nova') +
        '</section>';
      document.title = 'Contact · Nova Health Synergy';
    } else if (path === 'journal') {
      page.innerHTML =
        '<section class="inner-hero"><p class="eyebrow">Notes from Nova Health Synergy</p><h1>The <em>journal.</em></h1><p>A space for herbal curiosity and what comes next.</p></section><section class="section journal-page-card">' +
        photo('02', 'Nova’s handcrafted herbal infusions') +
        '<div><p class="eyebrow">December 20, 2023 · Necia Chavis</p><h2>Coming Soon!<br><em>Stay Tuned!</em></h2><p>Follow us for new product launches, courses and other updates.</p><a class="pill" href="#/journal/post">Read the journal entry</a></div></section>';
      document.title = 'Journal · Nova Health Synergy';
    } else if (path === 'newsletter') {
      page.innerHTML =
        '<section class="newsletter-local"><p class="eyebrow">Notes, remedies & new possibilities</p><h1>A little more<br><em>Nova.</em></h1><p>New product launches, courses and other updates from Necia and Nova Health Synergy.</p><p class="connection-note">Newsletter signups will open here soon. We are not collecting email addresses yet.</p><a class="pill" href="#/journal">Explore the journal</a></section>';
      document.title = 'Newsletter · Nova Health Synergy';
    } else if (path === 'bag') {
      page.innerHTML =
        '<section class="inner-hero"><p class="eyebrow">Your selections</p><h1>A little bag<br>of <em>goodness.</em></h1><p><button class="pill" data-open-bag>Open your bag</button></p><a class="text-link" href="#/shop">Keep exploring</a></section>';
      document.title = 'Your bag · Nova Health Synergy';
      renderBag();
      $('#bag-status').textContent = '';
      if (!$('#bag-dialog').open) $('#bag-dialog').showModal();
    } else if (path === 'journal/post') {
      page.innerHTML =
        '<article class="section journal-entry"><p class="eyebrow">December 20, 2023 · Necia Chavis</p><h1>Coming Soon!<br><em>Stay Tuned!</em></h1>' +
        photo('02', 'Nova’s handcrafted herbal infusions') +
        '<p><a class="text-link" href="#/journal">Back to the journal</a></p></article>';
      document.title = 'Coming Soon! Stay Tuned! · Nova Health Synergy';
    } else {
      page.innerHTML =
        '<section class="inner-hero"><h1>Let’s find your way<br><em>back to Nova.</em></h1><p><a class="pill" href="#/">Back home →</a></p></section>';
    }
  }
  prepareLinks();
  observe();
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
}
function prepareLinks() {
  document.querySelectorAll('a[href^="#/"]').forEach((a) => {
    const walk = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode())) node.textContent = node.textContent.replace(/[↗→]/g, '');
  });
}
window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#/')) renderRoute();
});

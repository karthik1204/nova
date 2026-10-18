function productCard(p, i) {
  const v = p.variants[selectedSizes[i]];
  return (
    '<article class="product-card reveal" data-card="' +
    i +
    '"><div class="product-art" data-type="' +
    p.key +
    '" style="--tile:' +
    p.color +
    '"><a class="product-card-link" href="#/product/' +
    p.key +
    '" aria-label="Explore ' +
    p.name +
    '">' +
    photo(p.cutout, p.name, 'loading="lazy"') +
    '</a><button class="card-gallery" data-open-product-gallery="' +
    i +
    '" aria-label="View all ' +
    p.name +
    ' photos">View all ' +
    galleryItems(p).length +
    ' photos</button><button class="spin-preview" data-preview="' +
    i +
    '" aria-label="View ' +
    p.name +
    ' in 3D">↻ View in 3D</button></div><div class="card-body"><p class="card-kicker">' +
    {
      digestive: 'Gut Healer. Deeply Soothing. Rapid Relief.',
      immunity: 'Fire Cider. Virus Killer. Rapid Relief.',
      broth: 'Nourishing. Immune-Boosting. Rejuvenating.'
    }[p.key] +
    '</p><a href="#/product/' +
    p.key +
    '"><h3>' +
    p.name +
    '</h3></a><div class="card-size-label"><span>' +
    (p.variants.length > 1 ? 'Choose your size' : 'Pack size') +
    '</span><a href="#/product/' +
    p.key +
    '">Details ↗</a></div><div class="card-sizes" aria-label="' +
    p.name +
    ' size">' +
    p.variants
      .map(
        (v, j) =>
          '<button class="card-size" data-card-size="' +
          j +
          '" data-product="' +
          i +
          '" aria-pressed="' +
          (j === selectedSizes[i]) +
          '">' +
          esc(v.size) +
          '</button>'
      )
      .join('') +
    '</div><button class="card-add" data-add-bag="' +
    i +
    '" aria-label="Add ' +
    p.name +
    ' to bag"><span class="card-add-label"><span aria-hidden="true">＋</span> Add to bag</span><span class="card-price">$' +
    v.price.toFixed(2) +
    '</span></button></div></article>'
  );
}
function cards(items = products) {
  return items.map((p) => productCard(p, products.indexOf(p))).join('');
}
const bag = new Map();
function renderBag() {
  let count = 0,
    total = 0,
    markup = '';
  bag.forEach((line, key) => {
    const p = products[line.product],
      v = p.variants[line.size];
    count += line.qty;
    total += v.price * line.qty;
    markup +=
      '<article class="bag-line">' +
      photo(p.cutout, p.name) +
      '<div><h3>' +
      p.name +
      '</h3><p>' +
      esc(v.size) +
      ' · $' +
      v.price.toFixed(2) +
      ' each</p><div class="bag-controls"><button data-bag-quantity="' +
      key +
      '" data-delta="-1" aria-label="Decrease ' +
      p.name +
      ' quantity">−</button><span>' +
      line.qty +
      '</span><button data-bag-quantity="' +
      key +
      '" data-delta="1" aria-label="Increase ' +
      p.name +
      ' quantity">+</button><button class="bag-remove" style="width:auto;border:0" data-bag-remove="' +
      key +
      '">Remove</button></div><a class="bag-store-link" data-close-bag href="#/product/' +
      p.key +
      '">Product details</a></div></article>';
  });
  $('#bag-items').innerHTML = markup
    ? markup +
      '<div class="bag-total"><small>Selected items subtotal</small><span>$' +
      total.toFixed(2) +
      '</span></div><p class="bag-footnote">USD · Excludes shipping and taxes. Saved for this visit only.</p><button class="pill bag-continue" disabled>Checkout coming soon</button>'
    : '<p class="bag-empty">Your bag is waiting for a little goodness.</p>';
  const badge = $('.bag-count');
  if (badge) badge.textContent = count;
  $('.cart-link').setAttribute('aria-label', 'Open bag, ' + count + ' items');
}
$('.cart-link').insertAdjacentHTML('beforeend', '<b class="bag-count">0</b>');
$('.cart-link span').textContent = 'Your bag';
$('.cart-link').addEventListener('click', (e) => {
  e.preventDefault();
  renderBag();
  $('#bag-status').textContent = '';
  $('#bag-dialog').showModal();
});

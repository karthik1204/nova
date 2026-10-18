function galleryItems(p) {
  if (window.NOVA_CMS_GALLERIES?.[p.key]?.length) return window.NOVA_CMS_GALLERIES[p.key];
  const scenes = {
    digestive: [
      'Bottle with a glass and dried flowers',
      'Overhead bottle and herbal still life',
      'Bottle in a rustic apothecary setting'
    ],
    immunity: [
      'Bottle with botanicals in warm sunlight',
      'Bottle beside a glass and citrus',
      'Overhead bottle and botanical still life'
    ],
    broth: [
      'Pouch beside a bowl of broth',
      'Pouch beside a mug of broth',
      'Overhead pouch and herbal broth still life'
    ]
  };
  return [
    { id: p.cutout, alt: p.name + ' packaging', caption: 'Product packaging', scene: false },
    {
      id: p.photo,
      alt: p.name + ' original product photograph',
      caption: 'Original product photograph',
      scene: false
    },
    ...(p.key === 'immunity'
      ? [
          {
            id: '10',
            alt: 'Immunity Tonic additional original photograph',
            caption: 'Additional original product photograph',
            scene: false
          }
        ]
      : []),
    ...scenes[p.key].map((caption, i) => ({
      id: p.key + '-scene-' + (i + 1),
      alt: p.name + ' — ' + caption.toLowerCase(),
      caption: caption + ' · Styled lifestyle image',
      scene: true
    }))
  ];
}
function galleryThumbs(p, scope) {
  return galleryItems(p)
    .map(
      (item, i) =>
        '<button data-gallery-photo="' +
        i +
        '" data-gallery-scope="' +
        scope +
        '" aria-label="Show ' +
        esc(item.alt) +
        '" aria-pressed="' +
        (i === 0) +
        '">' +
        photo(item.scene ? item.id + '-thumb' : item.id, '', 'loading="lazy" decoding="async"') +
        '</button>'
    )
    .join('');
}
function detailGallery(p) {
  const i = products.indexOf(p),
    items = galleryItems(p);
  return (
    '<div class="product-gallery" data-gallery-product="' +
    i +
    '" data-gallery-index="0"><button class="detail-image gallery-main" style="--tile:' +
    p.color +
    '" data-open-product-gallery="' +
    i +
    '" data-gallery-open-index="0" aria-label="Enlarge ' +
    p.name +
    ' photograph">' +
    photo(items[0].id, items[0].alt, 'id="detail-photo"') +
    '<span class="gallery-zoom-label">View larger</span></button><div class="gallery-toolbar"><button data-gallery-step="-1" data-gallery-scope="detail" aria-label="Previous ' +
    p.name +
    ' photo">Previous</button><span id="detail-gallery-count" aria-live="polite" aria-atomic="true">1 / ' +
    items.length +
    ' photos</span><button data-gallery-step="1" data-gallery-scope="detail" aria-label="Next ' +
    p.name +
    ' photo">Next</button></div><div class="gallery-thumbs" aria-label="' +
    p.name +
    ' photographs">' +
    galleryThumbs(p, 'detail') +
    '</div><p class="gallery-caption" id="detail-gallery-caption">Product packaging</p></div>'
  );
}
let dialogGalleryProduct = 0,
  dialogGalleryIndex = 0;
function selectGalleryPhoto(index, scope) {
  const isDialog = scope === 'dialog',
    root = isDialog ? $('#product-gallery-dialog') : $('.product-gallery');
  if (!root) return;
  const p = products[isDialog ? dialogGalleryProduct : Number(root.dataset.galleryProduct)],
    items = galleryItems(p),
    next = ((index % items.length) + items.length) % items.length,
    item = items[next];
  const image = $(isDialog ? '#gallery-dialog-image' : '#detail-photo');
  image.src = asset(item.id);
  image.alt = item.alt;
  $(isDialog ? '#gallery-dialog-count' : '#detail-gallery-count').textContent =
    next + 1 + ' / ' + items.length + ' photos';
  $(isDialog ? '#gallery-dialog-caption' : '#detail-gallery-caption').textContent = item.caption;
  root
    .querySelectorAll('[data-gallery-photo]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(Number(b.dataset.galleryPhoto) === next))
    );
  if (isDialog) dialogGalleryIndex = next;
  else {
    root.dataset.galleryIndex = String(next);
    const main = root.querySelector('.gallery-main');
    main.dataset.scene = String(item.scene);
    main.dataset.galleryOpenIndex = String(next);
  }
}
function openProductGallery(productIndex, index = 0) {
  dialogGalleryProduct = productIndex;
  const p = products[productIndex],
    dialog = $('#product-gallery-dialog');
  $('#gallery-dialog-title').textContent = p.name;
  dialog.querySelector('.gallery-dialog-stage').style.setProperty('--tile', p.color);
  $('#gallery-dialog-thumbs').innerHTML = galleryThumbs(p, 'dialog');
  selectGalleryPhoto(index, 'dialog');
  if (!dialog.open) dialog.showModal();
}
function stepGallery(step, scope) {
  const root = $('.product-gallery');
  selectGalleryPhoto(
    (scope === 'dialog' ? dialogGalleryIndex : Number(root?.dataset.galleryIndex || 0)) + step,
    scope
  );
}
document.addEventListener('keydown', (e) => {
  const root = e.target.closest('.product-gallery,#product-gallery-dialog');
  if (!root || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    stepGallery(
      e.key === 'ArrowRight' ? 1 : -1,
      root.id === 'product-gallery-dialog' ? 'dialog' : 'detail'
    );
  }
});

const themeLink = document.createElement('link');
themeLink.rel = 'stylesheet';
themeLink.href = new URL('figma-theme.css?v=1', document.currentScript.src).href;
document.head.append(themeLink);
const menu = document.querySelector('.menu-toggle');
const header = document.querySelector('.site-header');
menu?.addEventListener('click', () => {
  const isOpen = header.classList.toggle('open');
  menu.setAttribute('aria-expanded', isOpen);
});
document.querySelectorAll('.site-nav a').forEach(link => link.addEventListener('click', () => {
  header.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false');
}));
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#signup-form')?.addEventListener('submit', event => {
  event.preventDefault();
  event.currentTarget.querySelector('.form-success').textContent = 'You’re on the list. Welcome in.';
  event.currentTarget.reset();
});

document.querySelectorAll('.tilt-card').forEach(card => {
  const inner = card.querySelector('.tilt-card-inner');
  card.addEventListener('pointermove', event => {
    const rect = card.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width - .5; const y = (event.clientY - rect.top) / rect.height - .5;
    inner.style.transform = `rotateY(${x * 11}deg) rotateX(${y * -8}deg)`;
  });
  card.addEventListener('pointerleave', () => { inner.style.transform = ''; });
});
document.querySelectorAll('.size-picker').forEach(picker => picker.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
  picker.querySelectorAll('button').forEach(item => item.classList.remove('active')); button.classList.add('active');
})));
document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
  const toast = button.closest('.product-details')?.querySelector('.cart-toast'); if (toast) toast.textContent = 'Added to your ritual cart.';
}));
document.querySelectorAll('[data-demo-form]').forEach(form => form.addEventListener('submit', event => {
  event.preventDefault(); const response = form.querySelector('.form-response'); if (response) response.textContent = 'Thank you. Your note is on its way.'; form.reset();
}));

const carousel = document.querySelector('[data-product-carousel]');
if (carousel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const slides = [...carousel.querySelectorAll('.hero-product')];
  const dots = [...carousel.querySelectorAll('.showcase-dots button')];
  const name = carousel.querySelector('.showcase-name');
  const count = carousel.querySelector('.showcase-count');
  let current = 0;
  let rotation;
  const show = (next) => {
    if (next === current) return;
    const outgoing = slides[current];
    outgoing.classList.remove('active'); outgoing.classList.add('leaving');
    slides[next].classList.remove('leaving'); slides[next].classList.add('active');
    dots.forEach((dot, index) => { dot.classList.toggle('active', index === next); dot.setAttribute('aria-selected', index === next); });
    const title = slides[next].dataset.productName.split(' '); name.innerHTML = `${title.slice(0,-1).join(' ')} <em>${title.at(-1)}</em>`;
    count.textContent = `0${next + 1} / 03`;
    carousel.className = `spin-hero is-${slides[next].dataset.scene}`;
    window.setTimeout(() => outgoing.classList.remove('leaving'), 850);
    current = next;
  };
  const begin = () => { window.clearInterval(rotation); rotation = window.setInterval(() => show((current + 1) % slides.length), 3000); };
  dots.forEach((dot, index) => dot.addEventListener('click', () => { show(index); begin(); }));
  begin();
}

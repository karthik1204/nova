export const pages = [
  ['', 'Home'],
  ['shop', 'Shop'],
  ['product/digestive', 'Digestive Tonic'],
  ['product/immunity', 'Immunity Tonic'],
  ['product/broth', 'Immunity Broth Kit'],
  ['ingredients', 'Ingredients'],
  ['story', 'Our story'],
  ['contact', 'Contact'],
  ['journal', 'Journal'],
  ['journal/post', 'Journal article'],
  ['newsletter', 'Newsletter'],
  ['bag', 'Shopping bag']
];
export const sections = [
  ['header', 'Header', '#header'],
  ['announcement', 'Announcement', '.announcement-bar'],
  ['hero', 'Hero', '#hero'],
  ['kitchen', 'Kitchen', '#kitchen'],
  ['standard', 'Our standard', '.nova-standard'],
  ['shop', 'Product section', '.shop-section,.shop-page'],
  ['ingredients', 'Botanical feature', '.ingredient-feature'],
  ['founder', 'Founder', '.founder-section'],
  ['traditions', 'Traditions', '.traditions'],
  ['journal', 'Journal preview', '.journal-preview'],
  ['newsletter', 'Newsletter', '.newsletter,.newsletter-local'],
  ['footer', 'Footer', '.footer'],
  ['inner', 'Inner page introduction', '.inner-hero'],
  ['product', 'Product details', '.product-page'],
  ['story', 'Story article', '.story-page-header,.story-article'],
  ['contact', 'Contact page', '.contact-layout']
];
export const colorFields = [
  ['paper', 'Page background', '--paper', '#f6f3e9'],
  ['surface', 'Cards and panels', '--surface', '#fffcf4'],
  ['ink', 'Main text', '--ink', '#272b20'],
  ['muted', 'Secondary text', '--muted', '#636755'],
  ['line', 'Borders', '--line', '#d9d9c8'],
  ['forest', 'Forest accent', '--forest', '#253c30'],
  ['lime', 'Lime accent', '--lime', '#d9e899'],
  ['lilac', 'Lilac accent', '--lilac', '#bab9e7'],
  ['peach', 'Peach accent', '--peach', '#efad87']
];
export const validColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export const validScope = (scope) => scope === 'global' || pages.some(([path]) => path === scope);
export function textScope(element, route) {
  return element.closest('#header,.announcement-bar,.footer,#newsletter,#mobile-menu')
    ? 'global'
    : route;
}
export function colorsCSS(colors) {
  let css = '';
  for (const [key, , variable] of colorFields)
    if (validColor(colors[key])) css += `:root{${variable}:${colors[key]} !important;}`;
  for (const [key, , selector] of sections) {
    if (validColor(colors[key + 'Background']))
      css += `${selector}{background-color:${colors[key + 'Background']} !important;}`;
    if (validColor(colors[key + 'Text']))
      css += `${selector}{color:${colors[key + 'Text']} !important;}${selector
        .split(',')
        .map((s) => s + ' :is(h1,h2,h3,p,a,button,span,em,strong)')
        .join(',')}{color:${colors[key + 'Text']} !important;}`;
  }
  if (validColor(colors.buttonBackground))
    css += `.pill{background-color:${colors.buttonBackground} !important;}`;
  if (validColor(colors.buttonText)) css += `.pill{color:${colors.buttonText} !important;}`;
  return css;
}
export const colorKeys = [
  ...colorFields.map(([k]) => k),
  ...sections.flatMap(([k]) => [k + 'Background', k + 'Text']),
  'buttonBackground',
  'buttonText',
  'digestiveBackground',
  'immunityBackground',
  'brothBackground'
];

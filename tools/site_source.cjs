const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const manifest = () => JSON.parse(read('src/build.json'));
const scripts = () =>
  manifest()
    .scripts.map((file) => read('src/' + file))
    .join('\n');
const styles = () =>
  manifest()
    .styles.map((file) => read('src/' + file))
    .join('\n');

function assetPaths() {
  const assets = { 'nova-emblem': 'assets/branding/nova-emblem.png' };
  for (const file of fs.readdirSync(path.join(root, 'assets/prepared')).sort()) {
    if (file.endsWith('.webp')) assets[path.basename(file, '.webp')] = 'assets/prepared/' + file;
  }
  for (const key of ['digestive', 'immunity', 'broth']) {
    const views = key === 'broth' ? ['front', 'side', 'back'] : ['front', 'back', 'nutrition'];
    for (const view of views) {
      const master = key === 'immunity' && view === 'front';
      assets[master ? 'hero-immunity-master-front' : `hero-${key}-oct14-${view}`] = master
        ? 'assets/hero-masters/immunity-front.png'
        : `assets/hero-oct14/${key}-${view}.png`;
    }
  }
  return assets;
}

function content() {
  return { ...JSON.parse(read('src/content/site.json')), assets: assetPaths() };
}

module.exports = { root, read, manifest, scripts, styles, content };

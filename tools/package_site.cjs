// Only deploy browser files, never database scripts, private notes or node_modules.
const fs = require('node:fs');
const path = require('node:path');
const {root, content} = require('./site_source.cjs');
const destination = path.join(root, '_site');
if (fs.existsSync(destination)) throw new Error('_site already exists. Keep or move that previous package before packaging again.');
const routes = ['shop','shop/digestive-tonic','shop/immunity-tonic','shop/immunity-broth-kit','about','contact','journal','journal/coming-soon-stay-tuned'];
const files = new Set([
  'index.html','favicon.svg','.nojekyll',
  'assets/app.js','assets/site-data.js','assets/site.css','assets/cms-public.js',
  'admin/index.html','admin/admin.js','admin/admin.css',
  ...routes.map(route => route + '/index.html'),
  ...Object.values(content().assets)
]);
for (const file of files) {
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.copyFileSync(path.join(root,file), target);
}
console.log('Packaged '+files.size+' public files into _site. Backend source and admin email allowlist excluded.');

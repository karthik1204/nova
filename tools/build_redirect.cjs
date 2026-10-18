// GitHub Pages keeps old bookmarks working; the storefront is hosted on Cloudflare.
const fs = require('node:fs');
const path = require('node:path');
const {root} = require('./site_source.cjs');
const destination = path.join(root, '_redirect_site');
const canonical = 'https://nova-1qm.pages.dev/';
const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nova Health Synergy</title><link rel="canonical" href="${canonical}">
<p>Nova has moved. <a href="${canonical}">Open Nova Health Synergy</a>.</p>
<script>
const target = new URL(${JSON.stringify(canonical)});
target.pathname = location.pathname.replace(/^\\/nova(?=\\/|$)/, '') || '/';
target.search = location.search;
target.hash = location.hash;
location.replace(target.href);
</script></html>`;
for (const file of ['index.html', '404.html', 'admin/index.html']) {
  const output = path.join(destination, file);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, html);
}
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
console.log('Packaged the old-address redirect without storefront or admin data.');

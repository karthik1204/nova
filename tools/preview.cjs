// Local-only preview. Never exposes backend files, source, credentials or Git metadata.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const relative = pathname.replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative.endsWith('/') ? relative + 'index.html' : relative);
  if (!file.startsWith(root + path.sep) || !(relative === 'index.html' || /^(assets|admin)\//.test(relative)) || !types[path.extname(file)]) {
    res.writeHead(404).end(); return;
  }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
    res.end(content);
  });
}).listen(4173, '127.0.0.1', () => console.log('Nova preview: http://127.0.0.1:4173/?reviews-demo=1'));

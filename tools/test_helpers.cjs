const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const site = require('./site_source.cjs');

const js = site.scripts();
const css = site.styles();
const html = site.read('index.html');
const source = site.read('src/index.html') + '\n' + css + '\n' + js;
const data = JSON.parse(site.read('assets/site-data.js').split('window.NOVA_DATA = ')[1].trim().replace(/;$/, ''));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const parse = code => acorn.parse(code, { ecmaVersion: 'latest' });
function semanticHash(code) {
  return hash(JSON.stringify(parse(code), (key, value) => ['start', 'end', 'raw'].includes(key) ? undefined : value));
}
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const value of Object.values(node)) {
    const found = Array.isArray(value)
      ? value.map(item => walk(item, predicate)).find(Boolean)
      : walk(value, predicate);
    if (found) return found;
  }
}
function functionSource(name) {
  const node = walk(parse(js), node => node.type === 'FunctionDeclaration' && node.id.name === name);
  assert.ok(node, `Missing function: ${name}`);
  return js.slice(node.start, node.end);
}
function ingredientHandler() {
  const node = walk(parse(js), n => n.type === 'IfStatement' && n.test.type === 'MemberExpression' && n.test.property.name === 'ingredient');
  assert.ok(node, 'Ingredient handler exists');
  return js.slice(node.start, node.end);
}
const assetBytes = id => fs.readFileSync(path.join(site.root, data.assets[id]));
module.exports = { ...site, js, css, html, source, data, hash, semanticHash, functionSource, ingredientHandler, assetBytes };

import config from './config.json';
import { validColor, colorKeys, validScope } from './settings.js';

export const emptyContent = () => ({
  texts: {},
  images: {},
  galleries: {},
  pages: {},
  colors: {},
  prices: {},
  reviews: []
});
export const productKeys = ['digestive', 'immunity', 'broth'];
export const validReview = (item) =>
  Boolean(
    item &&
      productKeys.includes(item.product) &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0 &&
      item.name.length <= 80 &&
      typeof item.message === 'string' &&
      item.message.trim().length > 0 &&
      item.message.length <= 800 &&
      Number.isInteger(item.rating) &&
      item.rating >= 1 &&
      item.rating <= 5 &&
      typeof item.visible === 'boolean'
  );
export const editableAsset = (key, assets) =>
  Object.hasOwn(assets, key) && !key.startsWith('hero-') && key !== 'nova-emblem';
export function imageURL(value, assets) {
  if (typeof value !== 'string') return null;
  if (Object.values(assets).includes(value)) return value;
  const prefix = config.url + '/storage/v1/object/public/' + config.bucket + '/';
  return value.startsWith(prefix) &&
    /^[a-zA-Z0-9-]+\.(png|jpg|webp)$/.test(value.slice(prefix.length))
    ? value
    : null;
}
export function cleanContent(input, assets) {
  const result = emptyContent();
  if (!input || typeof input !== 'object') return result;
  if (Array.isArray(input.reviews)) {
    result.reviews = input.reviews
      .slice(0, 60)
      .filter(validReview)
      .map(({ product, name, message, rating, visible }) => ({
        product,
        name,
        message,
        rating,
        visible
      }));
  }
  for (const [scope, entries] of Object.entries(input.pages || {})) {
    if (!validScope(scope) || !entries || typeof entries !== 'object') continue;
    const safe = {};
    for (const [key, value] of Object.entries(entries).slice(0, 1000)) {
      if (
        editableText(key) &&
        typeof value === 'string' &&
        value.length <= 5000 &&
        !['__proto__', 'constructor', 'prototype'].includes(key)
      )
        safe[key] = value;
    }
    result.pages[scope] = safe;
  }
  for (const key of colorKeys)
    if (validColor(input.colors?.[key])) result.colors[key] = input.colors[key];
  for (const key of productKeys) {
    const values = input.prices?.[key];
    if (
      Array.isArray(values) &&
      values.length <= 3 &&
      values.every(
        (v) =>
          typeof v === 'number' &&
          Number.isFinite(v) &&
          v >= 0 &&
          v <= 100000 &&
          Math.abs(v * 100 - Math.round(v * 100)) < 0.00001
      )
    )
      result.prices[key] = values;
  }
  for (const [key, value] of Object.entries(input.texts || {}).slice(0, 500)) {
    if (
      key.length <= 5000 &&
      typeof value === 'string' &&
      value.length <= 5000 &&
      !['__proto__', 'constructor', 'prototype'].includes(key)
    )
      result.texts[key] = value;
  }
  for (const [key, value] of Object.entries(input.images || {})) {
    if (editableAsset(key, assets) && (value === null || imageURL(value, assets)))
      result.images[key] = value;
  }
  for (const key of productKeys) {
    const items = input.galleries?.[key];
    if (!Array.isArray(items) || !items.length || items.length > 20) continue;
    const valid = items.filter(
      (item) =>
        item &&
        imageURL(item.url, assets) &&
        typeof item.alt === 'string' &&
        item.alt.length <= 300 &&
        typeof item.caption === 'string' &&
        item.caption.length <= 300
    );
    if (valid.length === items.length)
      result.galleries[key] = valid.map(({ url, alt, caption }) => ({ url, alt, caption }));
  }
  return result;
}

// Safe DOM text replacement, never HTML insertion. Prices/numeric UI remain application data.
export function editableText(text) {
  return (
    typeof text === 'string' &&
    text.trim().length >= 1 &&
    text.length <= 5000 &&
    !/[$€£]|^[\d\s.,/%–—-]+$/.test(text)
  );
}

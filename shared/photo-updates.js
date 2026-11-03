(() => {
  'use strict';
  const assetBase = new URL('.', document.currentScript.src);
  const entries = window.FFM_PHOTO_UPDATES || {};
  const originalsOnly = new URLSearchParams(location.search).get('photos') === 'original';
  const failed = new Set(), originalFor = new Map();
  function resolve(source, base = document.baseURI) {
    const original = new URL(source, base).href;
    const entry = entries[source];
    if (originalsOnly || !entry) return original;
    const updated = new URL(entry.source, assetBase).href;
    if (failed.has(updated)) return original;
    originalFor.set(updated, original);
    return updated;
  }
  function brightness(source, fallback) {
    if (originalsOnly || !entries[source]) return fallback;
    const updated = new URL(entries[source].source, assetBase).href;
    return failed.has(updated) ? fallback : entries[source].brightness;
  }
  function fallback(source) {
    const original = originalFor.get(source);
    if (original) failed.add(source);
    return original;
  }
  async function decode(image) {
    const source = image.src;
    try { await image.decode(); }
    catch (error) {
      const original = fallback(source);
      if (!original) throw error;
      image.src = original;
      await image.decode();
    }
    return image;
  }
  async function load(source) {
    const image = new Image();
    image.src = source;
    return decode(image);
  }
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const original = fallback(image.src);
    if (original) image.src = original;
  }, true);
  window.FFM_PHOTOS = Object.freeze({resolve, brightness, fallback, decode, load, originalsOnly});
})();

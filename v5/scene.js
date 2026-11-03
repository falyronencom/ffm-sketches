(() => {
  'use strict';
  const layers = [document.getElementById('backdrop-a'),document.getElementById('backdrop-b')];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const coarsePointer = matchMedia('(any-pointer:coarse)');
  const narrowScreen = matchMedia('(max-width:899px)');
  const brightness = window.ALBUM_PHOTO_BRIGHTNESS || {};
  let active = -1, desiredSource = '', shownSource = '', request = 0;
  let queued = null, fade = null;

  function finishFade() {
    if (!fade) return;
    const finished = fade;
    fade = null;clearTimeout(finished.timer);
    layers[finished.next].style.opacity = '1';
    if (finished.old >= 0) layers[finished.old].style.opacity = '0';
    active = finished.next;shownSource = finished.source;
    flushBackground();
  }
  function flushBackground() {
    if (fade || !queued || document.hidden) return;
    const nextPhoto = queued;queued = null;
    if (shownSource === nextPhoto.source) return;
    const next = active === 0 ? 1 : 0;
    const layer = layers[next];
    layer.style.transition = 'none';layer.style.opacity = '0';
    layer.style.backgroundImage = `url("${nextPhoto.source}")`;
    layer.className = 'backdrop-layer ' + (nextPhoto.brightness < .55 ? 'is-dark' : 'is-light');
    layer.dataset.source = nextPhoto.source;
    layer.dataset.brightness = String(nextPhoto.brightness);
    layer.style.zIndex = '1';
    if (active >= 0) layers[active].style.zIndex = '0';
    // Keep the old image opaque underneath. The incoming opacity then gives an
    // actual crossfade without a dark dip in the middle of the transition.
    if (active < 0 || reduced.matches || nextPhoto.duration===0) {
      layer.style.opacity = '1';
      if (active >= 0) layers[active].style.opacity = '0';
      active = next;shownSource = nextPhoto.source;layer.style.transition = '';
      return;
    }
    const old = active;
    // Establish the zero-opacity starting style before applying the transition.
    layer.getBoundingClientRect();
    layer.style.transition = '';
    layer.style.transitionDuration=nextPhoto.duration+'ms';
    fade = {old,next,source:nextPhoto.source,timer:0};
    layer.style.opacity = '1';
    fade.timer = setTimeout(finishFade,nextPhoto.duration);
  }

  function setCollection(collection,label,options={}) {
    const shade = collection.shades.find(s => s.label === label) || collection.shades[0];
    const original = shade.draped || shade.flat;
    const source = window.FFM_PHOTOS?.resolve(original) || original;
    if (source === desiredSource && options.duration!==0) return;
    if(options.duration===0){queued=null;if(fade){layers[fade.next].style.transition='none';finishFade();}}
    desiredSource = source;
    const id = ++request;
    const ready = window.FFM_PHOTOS ? window.FFM_PHOTOS.load(source) : (async () => {
      const image = new Image();image.src = source;await image.decode();return image;
    })();
    ready.then(image => {
      if (id !== request) return;
      queued = {source:image.src,brightness:window.FFM_PHOTOS?.brightness(original,brightness[original] ?? .5) ?? brightness[original] ?? .5,duration:options.duration??1200};
      // Exactly two layers are reused. While a crossfade is running, only the
      // latest state is queued; old image-decode completions cannot win a race.
      flushBackground();
    }).catch(() => { /* Keep the last successfully decoded photo on a load failure. */ });
  }

  let frame = 0, x = 0, y = 0, targetX = 0, targetY = 0;
  let introMode=null;
  const enabled = () => introMode!=='opening' && !reduced.matches && finePointer.matches && !coarsePointer.matches && !narrowScreen.matches && navigator.maxTouchPoints === 0 && !document.hidden;
  function writeMotion() {
    root.style.setProperty('--scene-x',(x * 12).toFixed(3) + 'px');
    root.style.setProperty('--scene-y',(y * 12).toFixed(3) + 'px');
    const tilt=introMode==='closed'?2:1.5;
    root.style.setProperty('--book-rx',(-y * tilt).toFixed(4) + 'deg');
    root.style.setProperty('--book-ry',(x * tilt).toFixed(4) + 'deg');
  }
  function tick() {
    frame = 0;
    if (!enabled()) { resetMotion();return; }
    x += (targetX - x) * .06;y += (targetY - y) * .06;
    if (Math.abs(targetX - x) < .001 && Math.abs(targetY - y) < .001) {
      x = targetX;y = targetY;writeMotion();return;
    }
    writeMotion();frame = requestAnimationFrame(tick);
  }
  function resetMotion() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;x = y = targetX = targetY = 0;writeMotion();
  }
  function settlePointer() {
    targetX = targetY = 0;
    if (enabled() && !frame) frame = requestAnimationFrame(tick);
    else if (!enabled()) resetMotion();
  }
  window.addEventListener('pointermove',event => {
    if (!enabled() || event.pointerType === 'touch') return;
    if (document.querySelector('dialog[open]') || document.getElementById('book').getAttribute('aria-busy') === 'true' || event.buttons) { settlePointer();return; }
    targetX = Math.max(-1,Math.min(1,event.clientX / innerWidth * 2 - 1));
    targetY = Math.max(-1,Math.min(1,event.clientY / innerHeight * 2 - 1));
    if (!frame) frame = requestAnimationFrame(tick);
  },{passive:true});
  root.addEventListener('pointerleave',settlePointer);
  window.addEventListener('blur',resetMotion);
  for (const query of [reduced,finePointer,coarsePointer,narrowScreen]) query.addEventListener('change',() => { resetMotion();if (reduced.matches) finishFade(); });
  document.addEventListener('visibilitychange',() => {
    resetMotion();
    if (document.hidden) finishFade();else flushBackground();
  });
  window.ALBUM_SCENE = {setCollection,resetMotion,setIntroMode(mode){introMode=mode;resetMotion();}};
})();

(() => {
  'use strict';
  // Full-screen photo viewer inside the scene. The photo flies out of the book page and back (FLIP),
  // zooms as a magnifier up to 2× around the pointer and pans with light inertia; the arrows and the
  // strip switch shades and keep the book page and the scene in step. Catalog photos are 500×375,
  // so a deeper zoom would only enlarge the blur.
  const MAX = 2;
  function init(app) {
    const $ = (s, root = document) => root.querySelector(s);
    const dialog = $('#viewer'), stage = $('#viewer-stage'), img = $('#viewer-image'), ghost = $('#viewer-fade');
    const scaleOut = $('#viewer-scale'), zoomIn = $('#viewer-in'), zoomOut = $('#viewer-out');
    const reduced = matchMedia('(prefers-reduced-motion:reduce)'), touchFirst = matchMedia('(pointer:coarse)');
    const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    let collection = null, view = 'draped', returnTo = null, flying = null, frame = 0;
    let base = {x:0,y:0,w:0,h:0}, now = {s:1,tx:0,ty:0}, target = {s:1,tx:0,ty:0}, velocity = {x:0,y:0};
    const shade = () => app.shadeFor(collection);
    const sourceOf = s => {
      const source = view === 'flat' ? s.flat : s.draped || s.flat;
      return window.FFM_PHOTOS?.resolve(source) || source;
    };

    // The box the photo is fitted into: under the title, above the strip and the zoom controls.
    function area() {
      const small = innerWidth < 900;
      const top = small ? 118 : 72, bottom = small ? 156 : 146, side = small ? 12 : 92;
      return {x:side,y:top,w:Math.max(80,innerWidth - side * 2),h:Math.max(80,innerHeight - top - bottom)};
    }
    function fit() {
      const a = area(), iw = img.naturalWidth || 4, ih = img.naturalHeight || 3, k = Math.min(a.w / iw,a.h / ih);
      base = {w:iw * k,h:ih * k};base.x = a.x + (a.w - base.w) / 2;base.y = a.y + (a.h - base.h) / 2;
      Object.assign(img.style,{left:base.x + 'px',top:base.y + 'px',width:base.w + 'px',height:base.h + 'px'});
    }
    // A photo smaller than the screen stays fully on it; a larger one never shows its edges inside it.
    function clamp(t) {
      if (t.s <= 1.0005) return {s:1,tx:0,ty:0};
      const bound = (v,size,room) => size <= room ? Math.min(Math.max(v,0),room - size) : Math.min(0,Math.max(room - size,v));
      const x = bound(base.x + t.tx,base.w * t.s,innerWidth), y = bound(base.y + t.ty,base.h * t.s,innerHeight);
      return {s:t.s,tx:x - base.x,ty:y - base.y};
    }
    function paint() {
      img.style.transform = `translate(${now.tx}px,${now.ty}px) scale(${now.s})`;
      const top = target.s >= MAX - .001;
      scaleOut.textContent = top ? 'максимум' : Math.round(target.s * 100) + '%';
      zoomIn.disabled = top;zoomOut.disabled = target.s <= 1.001;
      dialog.classList.toggle('is-zoomed',target.s > 1.001);
    }
    function tick() {
      frame = 0;
      if (!pointers.size && Math.hypot(velocity.x,velocity.y) > .05) {
        target = clamp({s:target.s,tx:target.tx + velocity.x,ty:target.ty + velocity.y});
        velocity.x *= .9;velocity.y *= .9;
      }
      for (const k of ['s','tx','ty']) now[k] += (target[k] - now[k]) * .28;
      const settled = Math.abs(target.s - now.s) < .001 && Math.abs(target.tx - now.tx) < .3 && Math.abs(target.ty - now.ty) < .3 && Math.hypot(velocity.x,velocity.y) <= .05;
      if (settled) now = {...target};
      paint();
      if (!settled) frame = requestAnimationFrame(tick);
    }
    function go(next, instant = reduced.matches) {
      target = clamp(next);
      if (instant) { cancelAnimationFrame(frame);frame = 0;velocity = {x:0,y:0};now = {...target};paint(); }
      else if (!frame) frame = requestAnimationFrame(tick);
    }
    const reset = instant => go({s:1,tx:0,ty:0},instant);
    // Keeps the photo point under (px, py) in place while the scale changes.
    function zoomAt(scale, px, py, from = target, instant) {
      const s = Math.min(MAX,Math.max(1,scale));
      const ux = (px - base.x - from.tx) / from.s, uy = (py - base.y - from.ty) / from.s;
      go({s,tx:px - ux * s - base.x,ty:py - uy * s - base.y},instant);
    }
    const centre = () => [innerWidth / 2,base.y + base.h / 2];
    function toggleAt(px, py) { if (target.s > 1.01) reset();else zoomAt(MAX,px,py); }

    function chrome() {
      const s = shade(), list = collection.shades, i = list.indexOf(s);
      $('#viewer-title').textContent = `${collection.name} ${s.label}`;
      $('#viewer-switch').innerHTML = collection.drapedOnly ? '' : ['draped','flat'].map(v => `<button type="button" data-viewer-view="${v}" aria-pressed="${view === v}">${v === 'draped' ? 'Драпировка' : 'Фактура'}</button>`).join('');
      $('#viewer-prev').setAttribute('aria-label',`Предыдущий оттенок: ${collection.name} ${list[(i - 1 + list.length) % list.length].label}`);
      $('#viewer-next').setAttribute('aria-label',`Следующий оттенок: ${collection.name} ${list[(i + 1) % list.length].label}`);
      const strip = $('#viewer-strip');
      strip.innerHTML = list.map(t => `<button type="button" data-viewer-shade="${esc(t.label)}" aria-label="${esc(collection.name)} ${esc(t.label)}" aria-pressed="${t === s}"><img src="${esc(t.thumb)}" alt="" draggable="false"><span>${esc(t.label)}</span></button>`).join('');
      const chip = $('[aria-pressed=true]',strip);
      if (chip) { const r = strip.getBoundingClientRect(), c = chip.getBoundingClientRect();strip.scrollLeft += c.left - r.left - (r.width - c.width) / 2; }
      $('#viewer-hint').textContent = touchFirst.matches ? 'Два касания или щипок — увеличить, смахните вниз — закрыть' : 'Колесо или двойной клик — увеличить, перетащите — сдвинуть';
    }
    // Crossfade to another photo; the zoom goes back to the whole photo.
    function swap(src) {
      reset(true);
      if (!reduced.matches && img.getAttribute('src')) {
        ghost.getAnimations().forEach(a => a.cancel());
        ghost.src = img.currentSrc || img.src;
        Object.assign(ghost.style,{left:img.style.left,top:img.style.top,width:img.style.width,height:img.style.height});
        ghost.hidden = false;
      }
      img.src = src;
      return (window.FFM_PHOTOS ? window.FFM_PHOTOS.decode(img) : img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => {
        fit();reset(true);
        if (!ghost.hidden) ghost.animate([{opacity:1},{opacity:0}],{duration:320,easing:'ease-out'}).finished.then(() => { ghost.hidden = true; }).catch(() => {});
      });
    }
    function showShade(label) {
      if (!collection.shades.some(s => s.label === label)) return;
      app.selectShade(label);   // the book page and the scene background follow
      chrome();swap(sourceOf(shade()));
    }
    function step(d) {
      const list = collection.shades, i = list.indexOf(shade());
      showShade(list[(i + d + list.length) % list.length].label);
    }

    // FLIP between the photo on the book page and the fitted photo. The page shows the photo with
    // object-fit: cover, so the flight starts from the whole photo behind the page and a clip-path
    // that matches the page edges.
    function pageRect() {
      const r = document.querySelector('#spread .fabric-image img')?.getBoundingClientRect();
      return r && r.width && r.height ? r : null;
    }
    function fly(entering) {
      const r = pageRect();
      if (reduced.matches || !r) { dialog.classList.remove('is-flying');if (!entering) dialog.close();return; }
      const k = Math.max(r.width / base.w,r.height / base.h), vw = base.w * k, vh = base.h * k;
      const vx = r.left + (r.width - vw) / 2, vy = r.top + (r.height - vh) / 2;
      const page = {transform:`translate(${vx - base.x}px,${vy - base.y}px) scale(${k})`,clipPath:`inset(${(r.top - vy) / k}px ${(vx + vw - r.right) / k}px ${(vy + vh - r.bottom) / k}px ${(r.left - vx) / k}px)`};
      const here = {transform:`translate(${now.tx}px,${now.ty}px) scale(${now.s})`,clipPath:'inset(0px 0px 0px 0px)'};
      const timing = {duration:450,easing:'cubic-bezier(.2,.75,.25,1)'};
      dialog.classList.add('is-flying');
      flying = img.animate(entering ? [page,here] : [here,page],timing);
      dialog.animate([{backgroundColor:'rgba(8,7,6,0)'},{backgroundColor:'rgba(8,7,6,.94)'}],{...timing,direction:entering ? 'normal' : 'reverse'});
      flying.finished.then(() => {
        flying = null;
        if (entering) dialog.classList.remove('is-flying');else dialog.close();
      }).catch(() => { flying = null; });
    }

    function open(trigger) {
      collection = app.current();
      if (!collection || dialog.open) return;
      view = app.view(collection);returnTo = trigger;
      now = {s:1,tx:0,ty:0};target = {...now};velocity = {x:0,y:0};
      ghost.hidden = true;img.src = sourceOf(shade());
      chrome();
      window.ALBUM_SCENE?.resetMotion();
      dialog.classList.add('is-flying');
      dialog.showModal();
      (window.FFM_PHOTOS ? window.FFM_PHOTOS.decode(img) : img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => { fit();paint();fly(true); });
    }
    function close() {
      if (flying || !dialog.open) return;
      cancelAnimationFrame(frame);frame = 0;velocity = {x:0,y:0};
      fly(false);
    }
    dialog.addEventListener('cancel',e => { e.preventDefault();close(); });
    dialog.addEventListener('close',() => {
      img.getAnimations().forEach(a => a.cancel());dialog.classList.remove('is-flying','is-zoomed','is-dragging');
      img.style.transform = '';dialog.style.removeProperty('--drag');
      // A shade change re-renders the page, so the button that opened the viewer may be a new one.
      (returnTo?.isConnected ? returnTo : document.querySelector('#spread .expand-button') || document.getElementById('book')).focus({preventScroll:true});
    });
    $('#viewer-close').addEventListener('click',close);
    $('#viewer-prev').addEventListener('click',() => step(-1));
    $('#viewer-next').addEventListener('click',() => step(1));
    zoomIn.addEventListener('click',() => zoomAt(target.s * 1.25,...centre()));
    zoomOut.addEventListener('click',() => zoomAt(target.s / 1.25,...centre()));
    $('#viewer-strip').addEventListener('click',e => { const b = e.target.closest('[data-viewer-shade]');if (b) showShade(b.dataset.viewerShade); });
    $('#viewer-switch').addEventListener('click',e => {
      const b = e.target.closest('[data-viewer-view]');
      if (!b || b.dataset.viewerView === view) return;
      view = b.dataset.viewerView;chrome();swap(sourceOf(shade()));
      $(`[data-viewer-view="${view}"]`,dialog)?.focus();
    });
    dialog.addEventListener('keydown',e => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === '+' || e.key === '=') zoomAt(target.s * 1.25,...centre());
      else if (e.key === '-' || e.key === '_') zoomAt(target.s / 1.25,...centre());
      else if (e.key === '0') reset();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') step(e.key === 'ArrowRight' ? 1 : -1);
      else return;
      e.preventDefault();
    });
    stage.addEventListener('wheel',e => {
      e.preventDefault();
      if (flying) return;
      // A trackpad pinch arrives as wheel + ctrlKey with small steps.
      zoomAt(target.s * Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0018)),e.clientX,e.clientY);
    },{passive:false});
    // A touch double tap is recognised in endPointer; the browser's own dblclick after it would toggle back.
    let lastPointer = 'mouse';
    stage.addEventListener('dblclick',e => { if (!flying && lastPointer === 'mouse') toggleAt(e.clientX,e.clientY); });

    // One gesture model for mouse, pen and touch: one pointer pans (or, at 1× on a touch screen,
    // swipes — down closes, sideways changes the shade), two pointers pinch.
    const pointers = new Map();
    let gesture = null, lastTap = null;
    function startGesture() {
      const points = [...pointers.values()];
      const mid = {x:points.reduce((s,p) => s + p.x,0) / points.length,y:points.reduce((s,p) => s + p.y,0) / points.length};
      const distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x,points[0].y - points[1].y) : 0;
      return {mid,distance,from:{...target},start:mid,last:{...mid,t:performance.now()},moved:0,began:performance.now(),touch:points.length && [...pointers.values()][0].touch};
    }
    stage.addEventListener('pointerdown',e => {
      lastPointer = e.pointerType;
      if (flying || (e.pointerType === 'mouse' && e.button !== 0)) return;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,touch:e.pointerType !== 'mouse'});
      velocity = {x:0,y:0};gesture = startGesture();
      if (pointers.size === 1 && target.s > 1.001) dialog.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove',e => {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId,{...pointers.get(e.pointerId),x:e.clientX,y:e.clientY});
      const g = gesture, points = [...pointers.values()];
      const mid = {x:points.reduce((s,p) => s + p.x,0) / points.length,y:points.reduce((s,p) => s + p.y,0) / points.length};
      g.moved = Math.max(g.moved,Math.hypot(mid.x - g.start.x,mid.y - g.start.y));
      if (points.length > 1 && g.distance) {
        const distance = Math.hypot(points[0].x - points[1].x,points[0].y - points[1].y);
        const s = Math.min(MAX,Math.max(1,g.from.s * distance / g.distance));
        const ux = (g.start.x - base.x - g.from.tx) / g.from.s, uy = (g.start.y - base.y - g.from.ty) / g.from.s;
        go({s,tx:mid.x - ux * s - base.x,ty:mid.y - uy * s - base.y},true);
      } else if (target.s > 1.001) {
        go({s:target.s,tx:g.from.tx + mid.x - g.start.x,ty:g.from.ty + mid.y - g.start.y},true);
        const t = performance.now(), dt = Math.max(8,t - g.last.t);
        velocity = {x:(mid.x - g.last.x) / dt * 16,y:(mid.y - g.last.y) / dt * 16};g.last = {...mid,t};
      } else if (g.touch) {
        const dx = mid.x - g.start.x, dy = mid.y - g.start.y;
        const down = dy > 0 && dy > Math.abs(dx);
        img.style.transform = down ? `translate(0px,${dy}px)` : `translate(${dx * .35}px,0px)`;
        dialog.style.setProperty('--drag',down ? String(Math.min(dy / 360,.7)) : '0');
      }
    });
    function endPointer(e) {
      if (!pointers.has(e.pointerId)) return;
      const g = gesture;
      pointers.delete(e.pointerId);
      if (pointers.size) { gesture = startGesture();return; }
      gesture = null;dialog.classList.remove('is-dragging');
      if (!g) return;
      const dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
      if (g.touch && target.s <= 1.001 && g.moved > 10) {
        dialog.style.removeProperty('--drag');
        if (dy > 110 && dy > Math.abs(dx)) { paint();close();return; }
        paint();
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
        return;
      }
      if (g.touch && g.moved < 10 && performance.now() - g.began < 300) {
        // Double tap toggles the magnifier at the tapped point.
        if (lastTap && performance.now() - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x,e.clientY - lastTap.y) < 30) { toggleAt(e.clientX,e.clientY);lastTap = null; }
        else lastTap = {t:performance.now(),x:e.clientX,y:e.clientY};
        return;
      }
      if (reduced.matches) velocity = {x:0,y:0};
      else if (target.s > 1.001 && !frame && Math.hypot(velocity.x,velocity.y) > .05) frame = requestAnimationFrame(tick);
    }
    stage.addEventListener('pointerup',endPointer);
    stage.addEventListener('pointercancel',endPointer);
    addEventListener('resize',() => { if (dialog.open && !flying) { fit();reset(true); } });
    return {open,close};
  }
  window.ALBUM_VIEWER = {init};
})();

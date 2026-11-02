(() => {
  'use strict';
  const collections = window.ALBUM_COLLECTIONS, chapters = window.ALBUM_CHAPTERS;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plural = (n, forms) => forms[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
  const COLLECTIONS = ['коллекция','коллекции','коллекций'], SHADES = ['оттенок','оттенка','оттенков'], SAMPLES = ['образец','образца','образцов'];
  const key = 'ffm-fabric-album.samples.v1';
  const phone = {href:'tel:+375296259965',label:'+375 29 625 99 65'};
  const book = $('#book'), spread = $('#spread');
  const smallScreen = matchMedia('(max-width:899px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  const aliases = {Betsy:['бетси','бэтси'],Brabus:['брабус','барбус'],Festa:['феста']};
  const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  // The album reads like a book: contents, the collections chapter by chapter, then the visitor's selection.
  const pages = [{kind:'contents',slug:'soderzhanie',title:'Содержание'},...collections.map(c => ({kind:'collection',c,slug:slug(c.name),title:c.name})),{kind:'selection',slug:'podborka',title:'Подборка'}];
  const lastPage = pages.length - 1;
  const pageOf = c => collections.indexOf(c) + 1;
  const chapterStart = chapters.map((_,i) => pageOf(collections.find(c => c.chapter === i)));
  const pageForHash = hash => pages.findIndex(p => '#' + p.slug === String(hash).toLowerCase());
  const coverFabric = collections.find(c => c.name === 'Brabus');
  const totalShades = collections.reduce((n,c) => n + c.shades.length,0);
  // With ?intro=1 and a collection address the cover still opens on the contents; the album then turns to it.
  const deepTarget = window.ALBUM_INTRO_POLICY.show ? Math.max(0,pageForHash(location.hash)) : 0;
  const state = {
    index: deepTarget ? 0 : Math.max(0,pageForHash(location.hash)),
    selected: Object.fromEntries(collections.map(c => [c.name,c.initial])),
    views: Object.fromEntries(collections.map(c => [c.name,'draped'])),
    samples: [], turn: null, gesture: null, suppressClick: false, introActive:window.ALBUM_INTRO_POLICY.show
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) state.samples = saved.filter((s,i,all) => s && collections.some(c => c.name === s.name && c.shades.some(t => t.label === s.label)) && all.findIndex(t => t?.name === s.name && t?.label === s.label) === i).map(s => ({name:s.name,label:s.label}));
  } catch { /* The album still works with a browser-local session if storage is unavailable. */ }
  const page = () => pages[state.index];
  const current = () => page().c;
  const shadeFor = c => c.shades.find(s => s.label === state.selected[c.name]) || c.shades[0];
  const saved = (name,label) => state.samples.some(s => s.name === name && s.label === label);
  const sampleItems = () => state.samples.map(item => { const c = collections.find(c => c.name === item.name);return {c,s:c.shades.find(s => s.label === item.label)}; });
  const photoFor = c => state.views[c.name] === 'flat' ? shadeFor(c).flat : shadeFor(c).draped || shadeFor(c).flat;
  // Small fixed tilts make the cut samples look glued by hand, without random jitter between renders.
  const tilt = i => (((i * 7 + 3) % 5) - 2) * .35 + 'deg';
  function sceneFor(p) {
    if (p.kind === 'collection') return [p.c,state.selected[p.c.name]];
    const last = p.kind === 'selection' && state.samples.at(-1);
    return last ? [collections.find(c => c.name === last.name),last.label] : [coverFabric,'14'];
  }
  const updateScene = options => { if(!state.introActive) window.ALBUM_SCENE?.setCollection(...sceneFor(page()),options); };
  function setCollectionIndex(index) { state.index = index;updateScene(); }
  const pad = n => String(n).padStart(2,'0');
  const switchHTML = (view, attr = 'data-view') => `<button type="button" ${attr}="draped" aria-pressed="${view === 'draped'}">Драпировка</button><button type="button" ${attr}="flat" aria-pressed="${view === 'flat'}">Фактура</button>`;
  const addHTML = (c, mobile = false) => {
    const s = shadeFor(c), included = saved(c.name,s.label);
    return `<button type="button" class="primary${mobile ? '' : ' desktop-add'}" data-add ${included ? 'disabled' : ''}>${mobile ? included ? 'В подборке' : 'Образец' : included ? 'В подборке' : 'Добавить образец'}${icon(included ? 'check' : 'plus')}</button>`;
  };
  const sampleHTML = (src,i) => `<span class="swatch-sample" style="--tilt:${tilt(i)}"><span class="swatch-cut"><img src="${esc(src)}" alt="" draggable="false"></span></span>`;

  function photoPage(c) {
    const s = shadeFor(c), index = collections.indexOf(c);
    return `<figure class="photo-page">
      <div class="fabric-image" data-photo-surface data-zoom role="button" tabindex="0" aria-label="Рассмотреть ${esc(c.name)} ${esc(s.label)} крупно"><img src="${esc(photoFor(c))}" alt="${esc(c.name)} ${esc(s.label)} — ${state.views[c.name] === 'flat' ? 'плоская фактура' : 'ткань в драпировке'}" draggable="false" fetchpriority="high"></div>
      <span class="photo-heading">${pad(index + 1)} / ${esc(c.subtitle)}</span>
      <button class="expand-button" data-zoom type="button" aria-label="Увеличить фотографию ${esc(c.name)} ${esc(s.label)}">${icon('expand')}</button>
      <div class="photo-bottom"><span class="sample-ticket"><small>Выбранный оттенок</small><strong>${esc(c.name)} ${esc(s.label)}</strong></span>${c.drapedOnly ? '' : `<div class="view-switch" aria-label="Вид ткани">${switchHTML(state.views[c.name])}</div>`}</div>
    </figure>`;
  }

  function detailPage(c) {
    const s = shadeFor(c), index = collections.indexOf(c), n = c.shades.length;
    const density = c.specs.density.match(/\d+/)?.[0] || c.specs.density;
    const blend = c.specs.composition.match(/^(\d+%) ([^,]+)$/);
    return `<section class="detail-page" aria-label="Коллекция ${esc(c.name)}">
      <div class="folio"><span>Fabric’s / ${esc(chapters[c.chapter].title)}</span><span>${pad(index + 1)} — ${pad(collections.length)}</span></div>
      <div class="collection-heading"><h2 id="collection-title">${esc(c.name)}</h2><span class="material-category">${esc(c.cat)}</span></div>
      <p class="collection-note">${esc(c.note)}</p>
      <div class="palette-heading"><strong>Выберите оттенок</strong><span>${n} ${plural(n,SHADES)} / <span class="shade-current">${esc(s.label)}</span></span></div>
      <div class="swatches${n <= 6 ? ' short' : n > 30 ? ' many' : ''}" role="group" aria-label="Оттенки ${esc(c.name)}">${c.shades.map((t,i) => `<button type="button" class="swatch${saved(c.name,t.label) ? ' is-saved' : ''}" data-shade="${esc(t.label)}" data-shade-index="${i}" aria-label="${esc(c.name)} ${esc(t.label)}${saved(c.name,t.label) ? ', в подборке' : ''}" aria-pressed="${s.label === t.label}">${sampleHTML(t.thumb,i)}<span class="swatch-label">${esc(t.label)}</span></button>`).join('')}</div>
      <div class="sample-label"><p class="label-head"><span>Этикетка образца</span><span>Ширина ${esc(c.specs.width.replace('+/-','±'))}</span></p><dl class="specs"><div><dt>Арт.</dt><dd>${esc(c.name)} ${esc(s.label)}</dd></div><div><dt>Износостойкость</dt><dd>${esc(c.specs.martindale.replace(' циклов',''))} <small>циклов</small></dd></div><div><dt>Плотность</dt><dd>${esc(density)} <small>г/м²</small></dd></div><div><dt>Состав</dt><dd>${blend ? `${esc(blend[1])} <small>${esc(blend[2])}</small>` : `<small>${esc(c.specs.composition)}</small>`}</dd></div></dl></div>
      ${addHTML(c)}<p class="detail-action-note">Сохраните оттенок — он появится на последней странице альбома</p>
    </section>`;
  }

  // Contents: every collection as a cut sample on the left, the chapters in words on the right.
  function contentsSpread() {
    const tiles = collections.map((c,i) => `<button type="button" class="mosaic-tile" data-page="${i + 1}" aria-label="${esc(c.name)}, ${esc(chapters[c.chapter].title)}"><img src="${esc(shadeFor(c).thumb)}" alt="" draggable="false"><span>${esc(c.name)}</span></button>`).join('');
    const toc = chapters.map((ch,i) => `<li><button type="button" class="toc-chapter" data-page="${chapterStart[i]}"><span>${pad(i + 1)}</span>${esc(ch.title)}</button><p class="toc-names">${collections.filter(c => c.chapter === i).map(c => `<button type="button" data-page="${pageOf(c)}">${esc(c.name)}</button>`).join('<span aria-hidden="true"> · </span>')}</p></li>`).join('');
    return `<figure class="photo-page mosaic-page">
      <div class="mosaic" role="group" aria-label="Все коллекции альбома">${tiles}</div>
      <span class="sample-ticket mosaic-ticket" aria-hidden="true">${mosaicTicket()}</span>
    </figure>
    <section class="detail-page contents-page" aria-label="Содержание альбома">
      <div class="folio"><span>Fabric’s / Альбом коллекций</span><span>00 — ${pad(collections.length)}</span></div>
      <div class="collection-heading"><h2 id="collection-title">Содержание</h2></div>
      <p class="collection-note">${chapters.length} разделов, как в каталоге. Нажмите на раздел или коллекцию — альбом откроется на нужной странице.</p>
      <ol class="toc">${toc}</ol>
      <p class="detail-action-note contents-hint">Закладки на краю альбома ведут к разделам, «Коллекции» вверху — поиск по названию и номеру</p>
    </section>`;
  }

  // The last spread gathers the saved samples into one list for the manager.
  function selectionSpread() {
    const items = sampleItems(), count = items.length, shown = items.slice(-12), more = count - shown.length;
    const board = shown.length ? shown.map(({c,s},i) => `<button type="button" class="board-sample" data-saved-open="${more + i}" aria-label="Открыть ${esc(c.name)} ${esc(s.label)}">${sampleHTML(s.thumb,i * 3 + 1)}<span class="board-tag">${esc(c.name)} <b>${esc(s.label)}</b></span></button>`).join('')
      : `<p class="board-empty"><span class="board-ghosts" aria-hidden="true"><i></i><i></i><i></i></span>Здесь соберутся образцы, которые вы отметите на страницах коллекций.</p>`;
    const rows = items.map(({c,s},i) => `<article class="sample-row"><button type="button" class="sample-photo" data-saved-open="${i}" aria-label="Открыть ${esc(c.name)} ${esc(s.label)}"><img src="${esc(s.thumb)}" alt="" width="44" height="44"></button><button type="button" class="sample-info" data-saved-open="${i}"><strong>${esc(c.name)} ${esc(s.label)}</strong><small>${esc(c.cat)} · ${esc(c.subtitle)}</small></button><button class="remove-sample" type="button" data-remove="${i}" aria-label="Убрать ${esc(c.name)} ${esc(s.label)} из подборки">${icon('close')}</button></article>`).join('');
    return `<figure class="photo-page board-page">
      <div class="board${count ? '' : ' is-empty'}" style="--cols:${Math.min(Math.max(shown.length,1),4)};--size:${shown.length <= 4 ? 124 : shown.length <= 8 ? 98 : 84}px">${board}</div>
      <span class="photo-heading">Доска образцов${more > 0 ? ` · ещё ${more} в списке` : ''}</span>
    </figure>
    <section class="detail-page selection-page" aria-label="Ваша подборка">
      <div class="folio"><span>Fabric’s / Ваша подборка</span><span>Последняя страница</span></div>
      <div class="collection-heading"><h2 id="collection-title">Подборка</h2><span class="material-category">${count} ${plural(count,SAMPLES)}</span></div>
      <p class="collection-note">${count ? 'Отправьте список менеджеру — он проверит наличие и подготовит образцы.' : 'Пока пусто. Откройте коллекцию, выберите оттенок и нажмите «Добавить образец».'}</p>
      <div class="selection-list">${rows}</div>
      <div class="selection-actions">
        ${count ? `<button type="button" class="primary" data-send>Отправить список в Viber${icon('arrow')}</button>` : `<button type="button" class="primary" data-page="0">Открыть содержание${icon('arrow')}</button>`}
        <div class="secondary-actions"><a class="secondary" href="${phone.href}">Позвонить ${phone.label}</a>${count ? '<button type="button" class="secondary" data-copy>Скопировать список</button>' : ''}</div>
        <label class="copy-fallback" hidden>Скопируйте выделенный текст<textarea readonly rows="5"></textarea></label>
        <p class="detail-action-note" data-copy-status role="status">Макет: список копируется, отправка в Viber появится на новом сайте</p>
      </div>
    </section>`;
  }

  // On the contents samples the ticket names the collection under the pointer or focus.
  const mosaicTicket = c => c ? `<small>${esc(chapters[c.chapter].title)}</small><strong>${esc(c.name)}</strong><small>${c.shades.length} ${plural(c.shades.length,SHADES)}</small>`
    : `<small>00 / Все коллекции</small><strong>${collections.length} ${plural(collections.length,COLLECTIONS)}</strong><small>${totalShades} ${plural(totalShades,SHADES)}</small>`;
  function nameTicket(e) {
    const ticket = $('.mosaic-ticket',spread);
    if (!ticket) return;
    const tile = /out|leave/.test(e.type) ? null : e.target.closest('.mosaic-tile');
    ticket.innerHTML = mosaicTicket(tile && pages[Number(tile.dataset.page)].c);
  }
  for (const type of ['pointerover','focusin','focusout','pointerleave']) spread.addEventListener(type,nameTicket);

  function renderBook(focusSelector) {
    const p = page();
    spread.innerHTML = p.kind === 'contents' ? contentsSpread() : p.kind === 'selection' ? selectionSpread() : photoPage(p.c) + detailPage(p.c);
    document.documentElement.dataset.page = p.kind;
    updateSavedUI();
    if (focusSelector) $(focusSelector,spread)?.focus({preventScroll:true});
  }

  const edgeTabs = $('#edge-tabs');
  edgeTabs.innerHTML = chapters.map((ch,i) => `<button type="button" class="edge-tab" data-page="${chapterStart[i]}" style="--i:${i}" aria-label="Раздел ${esc(ch.title)}: ${ch.count} ${plural(ch.count,COLLECTIONS)}"><span>${esc(ch.tab)}</span></button>`).join('');
  function updateEdgeTabs() {
    const chapter = current()?.chapter ?? -1;
    $$('.edge-tab',edgeTabs).forEach((tab,i) => {
      // As in a printed tabbed book, tabs of the chapters already passed stick out on the left.
      const left = chapterStart[i] <= state.index;
      if (tab.classList.contains('is-left') !== left) {
        tab.classList.toggle('is-left',left);
        tab.classList.remove('emerge');tab.getBoundingClientRect();tab.classList.add('emerge');
      }
      tab.setAttribute('aria-current',String(i === chapter));
    });
  }
  function stripHTML() {
    const p = page();
    if (p.kind !== 'collection') return `<p class="strip-caption">${p.kind === 'contents' ? `${chapters.length} разделов <span>${collections.length} ${plural(collections.length,COLLECTIONS)}</span>` : `Подборка <span>${state.samples.length} ${plural(state.samples.length,SAMPLES)}</span>`}</p>`;
    const list = collections.filter(c => c.chapter === p.c.chapter);
    return `<p class="strip-caption">${esc(chapters[p.c.chapter].title)} <span>${pad(list.indexOf(p.c) + 1)} / ${pad(list.length)}</span></p><div class="strip-row">${list.map(c => `<button type="button" class="strip-chip" data-page="${pageOf(c)}" aria-label="Открыть коллекцию ${esc(c.name)}" aria-current="${c === p.c}" title="${esc(c.name)}"><img src="${esc(shadeFor(c).thumb)}" alt="" width="30" height="30"></button>`).join('')}</div>`;
  }
  function updateNavigation() {
    const busy = Boolean(state.turn), before = pages[state.index - 1], after = pages[state.index + 1];
    $('#previous').disabled = busy || state.index === 0;
    $('#next').disabled = busy || state.index === lastPage;
    $('#previous-name').textContent = before?.title || 'Назад';
    $('#next-name').textContent = after?.title || 'Далее';
    $('#previous').setAttribute('aria-label',before ? `Предыдущая страница: ${before.title}` : 'Открыта первая страница');
    $('#next').setAttribute('aria-label',after ? `Следующая страница: ${after.title}` : 'Открыта последняя страница');
    const strip = $('#chapter-tabs');
    strip.innerHTML = stripHTML();
    const row = $('.strip-row',strip), chip = $('[aria-current=true]',strip);
    if (row && chip) { const r = row.getBoundingClientRect(), c = chip.getBoundingClientRect();row.scrollLeft += c.left - r.left - (r.width - c.width) / 2; }
    updateEdgeTabs();
  }

  function updateSavedUI() {
    const count = state.samples.length;
    $$('[data-sample-count]').forEach(el => el.textContent = count);
    $('#samples-open').setAttribute('aria-label',`Моя подборка: ${count} ${plural(count,SAMPLES)}`);
    const c = current();
    if (!c) { $('#mobile-save').innerHTML = '';return; }
    const s = shadeFor(c);
    $('#mobile-save').innerHTML = `<img src="${esc(s.thumb)}" alt=""><span class="mobile-label">${esc(c.name)} ${esc(s.label)}<small>Ваша подборка тканей</small></span>${addHTML(c,true)}`;
    const add = $('[data-add]',spread);
    if (add) {
      const included = saved(c.name,s.label);
      add.disabled = included;
      add.innerHTML = `${included ? 'В подборке' : 'Добавить образец'}${icon(included ? 'check' : 'plus')}`;
    }
    $$('[data-shade]',spread).forEach(b => {
      const included = saved(c.name,b.dataset.shade);
      b.classList.toggle('is-saved',included);
      b.setAttribute('aria-label',`${c.name} ${b.dataset.shade}${included ? ', в подборке' : ''}`);
    });
  }

  function persist() {
    try { localStorage.setItem(key,JSON.stringify(state.samples)); }
    catch { toast('Образцы сохранены до закрытия страницы'); }
  }
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('show');
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'),2400);
  }
  function addSample() {
    const c = current();
    if (state.turn || !c) return;
    const s = shadeFor(c);
    if (saved(c.name,s.label)) return;
    state.samples.push({name:c.name,label:s.label});
    persist(); updateSavedUI();
    toast(`${c.name} ${s.label} — в вашей подборке`);
  }

  function selectShade(label, focus = false) {
    if (state.turn || !current()?.shades.some(s => s.label === label)) return;
    state.selected[current().name] = label;
    updateScene();
    renderBook(focus ? `[data-shade="${CSS.escape(label)}"]` : undefined);
    $('#page-status').textContent = `Выбран оттенок ${current().name} ${label}`;
  }

  function clonePage(el) {
    const clone = el.cloneNode(true);
    clone.removeAttribute('id');
    $$('[id]',clone).forEach(n => n.removeAttribute('id'));
    clone.inert = true;
    clone.setAttribute('aria-hidden','true');
    return clone;
  }
  function setURL() {
    try { history.replaceState(null,'','#' + page().slug); } catch { /* file:// preview */ }
  }
  function preload(index) {
    const c = pages[index]?.c;
    if (!c) return;
    for (const src of [photoFor(c),...c.shades.map(s => s.thumb)]) { const img = new Image(); img.src = src; }
  }
  function pageStatus() {
    const p = page(), n = p.c?.shades.length;
    $('#page-status').textContent = p.kind === 'collection' ? `Коллекция ${p.c.name}. ${n} ${plural(n,SHADES)}.` : p.kind === 'contents' ? 'Содержание альбома.' : `Ваша подборка: ${state.samples.length} ${plural(state.samples.length,SAMPLES)}.`;
  }

  function beginTurn(target) {
    if (state.introActive || state.turn || target === state.index || target < 0 || target > lastPage) return null;
    const from = state.index, forward = target > from, mobile = smallScreen.matches;
    if (reducedMotion.matches) {
      setCollectionIndex(target); renderBook(); updateNavigation(); setURL(); pageStatus();
      return null;
    }
    const oldLeft = clonePage(spread.firstElementChild);
    const oldRight = clonePage(spread.lastElementChild);
    const oldSpread = mobile ? clonePage(spread) : null;
    const oldHeight = book.getBoundingClientRect().height;
    setCollectionIndex(target);
    renderBook();
    const nextHeight = book.getBoundingClientRect().height;
    if (mobile) book.style.minHeight = Math.max(oldHeight,nextHeight) + 'px';
    // On a phone the page turns a little longer and with a softer curve, so a flick still reads as a turn.
    const duration = mobile ? 1000 : 1150;
    const easing = mobile ? 'cubic-bezier(.35,.12,.3,1)' : 'cubic-bezier(.25,.08,.75,1)';
    // One inherited-property animation drives geometry and lighting. Seeking,
    // reversing and cancelling a drag therefore cannot desynchronise shadows.
    // Actual opacity stays off the desktop scene/leaf, preserving Chrome 3D.
    const {scene,animation}=window.ALBUM_TURN_PHYSICS.create({host:book,front:mobile?oldSpread:forward?oldRight:oldLeft,back:mobile?null:clonePage(forward?spread.firstElementChild:spread.lastElementChild),stationary:forward?oldLeft:oldRight,forward,mobile,duration,easing});
    spread.inert = true;book.setAttribute('aria-busy','true');
    const turn = {from,to:target,animation,scene,duration,commit:true,completed:false};
    state.turn = turn;updateNavigation();
    function finish() {
      if (turn.completed) return;
      turn.completed = true;
      if (!turn.commit) { setCollectionIndex(from); renderBook(); }
      scene.remove();animation.cancel();spread.inert = false;book.style.minHeight = '';book.removeAttribute('aria-busy');
      state.turn = null;updateNavigation();setURL();updateSavedUI();
      if (mobile && turn.commit && book.getBoundingClientRect().top < -20) book.scrollIntoView({block:'start',behavior:'auto'});
      pageStatus();
      preload(state.index + 1);preload(state.index - 1);
    }
    turn.finish = finish;
    animation.finished.then(finish).catch(() => {});
    return turn;
  }

  function navigate(target) {
    if (smallScreen.matches && target >= 0 && target <= lastPage && target !== state.index && book.getBoundingClientRect().top < -20) book.scrollIntoView({block:'start',behavior:'auto'});
    // Keep keyboard focus in the strip or on the tabs when the page changes under it.
    const area = document.activeElement?.closest('#chapter-tabs,#edge-tabs');
    const refocus = () => { if (area) $(`[data-page="${target}"]`,area)?.focus({preventScroll:true}); };
    const turn = beginTurn(target);
    if (turn) {
      turn.animation.play();
      turn.animation.finished.then(refocus).catch(() => {});
    } else refocus();
  }

  // Pointer events share one horizontal gesture; vertical scrolling stays native on phones.
  book.addEventListener('pointerdown', e => {
    if (state.introActive || state.turn || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('button,a,input,textarea,.swatches,.selection-list')) return;
    state.gesture = {id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,turn:null,horizontal:false};
  });
  book.addEventListener('pointermove', e => {
    const g = state.gesture;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    g.dx = dx;
    if (!g.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { state.gesture = null;return; }
    if (!g.horizontal && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      book.setPointerCapture(e.pointerId);
      g.horizontal = true;state.suppressClick = true;
      const target = state.index + (dx < 0 ? 1 : -1);
      g.direction = dx < 0 ? -1 : 1;
      if (!reducedMotion.matches) g.turn = beginTurn(target);
      else g.target = target;
    }
    if (g.turn) {
      // On a phone the finger drives at most half of the turn; the rest always plays as animation.
      const progress = Math.max(0,Math.min(smallScreen.matches ? .5 : .93,dx * g.direction / (book.clientWidth * (smallScreen.matches ? 1.15 : .72))));
      g.turn.animation.currentTime = progress * g.turn.duration;
    }
  });
  function endGesture(e, cancelled = false) {
    const g = state.gesture;
    if (!g || e.pointerId !== g.id) return;
    state.gesture = null;
    if (book.hasPointerCapture(e.pointerId)) book.releasePointerCapture(e.pointerId);
    if (g.turn) {
      g.turn.commit = !cancelled && g.dx * g.direction > 55;
      if (!g.turn.commit && !g.turn.animation.currentTime) g.turn.finish();
      else {
        // A quick flick must not fire the page away: whatever is left plays for at least about half a second.
        const t = g.turn.animation.currentTime, left = g.turn.commit ? g.turn.duration - t : t;
        g.turn.animation.playbackRate = (g.turn.commit ? 1 : -1) * Math.min(1,left / (smallScreen.matches ? 600 : 520));
        g.turn.animation.play();
      }
    } else if (g.horizontal && !cancelled && Math.abs(g.dx) > 55 && g.target !== undefined) navigate(g.target);
    if (g.horizontal) setTimeout(() => { state.suppressClick = false; },0);
  }
  book.addEventListener('pointerup',e => endGesture(e));
  book.addEventListener('pointercancel',e => endGesture(e,true));
  book.addEventListener('click',e => { if (state.suppressClick) { e.preventDefault();e.stopImmediatePropagation(); } },true);
  book.addEventListener('dragstart',e => e.preventDefault());

  book.addEventListener('click',e => {
    if (state.turn) return;
    const b = e.target.closest('[data-shade],[data-view],[data-add],[data-zoom],[data-page],[data-saved-open],[data-remove],[data-send],[data-copy]');
    if (!b) return;
    if (b.hasAttribute('data-shade')) selectShade(b.dataset.shade,true);
    else if (b.hasAttribute('data-view')) {
      state.views[current().name] = b.dataset.view;
      renderBook(`[data-view="${b.dataset.view}"]`);
    } else if (b.hasAttribute('data-add')) addSample();
    else if (b.hasAttribute('data-zoom')) openZoom(b);
    else if (b.hasAttribute('data-page')) navigate(Number(b.dataset.page));
    else if (b.hasAttribute('data-saved-open')) openSaved(Number(b.dataset.savedOpen));
    else if (b.hasAttribute('data-remove')) removeSample(Number(b.dataset.remove));
    else sendList(b.hasAttribute('data-send'));
  });
  $('#mobile-save').addEventListener('click',e => { if (e.target.closest('[data-add]')) addSample(); });
  $('#previous').addEventListener('click',() => navigate(state.index - 1));
  $('#next').addEventListener('click',() => navigate(state.index + 1));
  $('#chapter-tabs').addEventListener('click',e => {
    const b = e.target.closest('[data-page]');
    if (b) navigate(Number(b.dataset.page));
  });
  document.addEventListener('keydown',e => {
    if (state.introActive || $('dialog[open]') || state.turn || e.altKey || e.metaKey || e.ctrlKey || e.target.matches('input,textarea,select')) return;
    const swatch = e.target.closest('[data-shade]');
    if (swatch && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
      e.preventDefault();
      const cols = getComputedStyle($('.swatches',spread)).gridTemplateColumns.split(' ').length;
      const index = Number(swatch.dataset.shadeIndex), shades = current().shades;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? shades.length - 1 : index + ({ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[e.key]);
      selectShade(shades[Math.max(0,Math.min(shades.length - 1,next))].label,true);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();navigate(state.index + (e.key === 'ArrowRight' ? 1 : -1));
    } else if (e.target.matches('[data-photo-surface]') && ['Enter',' '].includes(e.key)) { e.preventDefault();openZoom(e.target); }
  });

  const returnFocus = new Map();
  function openDialog(dialog,trigger) {
    if (state.turn) return;
    returnFocus.set(dialog,trigger || document.activeElement);
    window.ALBUM_SCENE?.resetMotion();
    dialog.showModal();
  }
  $$('dialog:not(#viewer)').forEach(dialog => {
    $('[data-close]',dialog).addEventListener('click',() => dialog.close());
    dialog.addEventListener('click',e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close',() => {
      const target = returnFocus.get(dialog);
      if (target?.isConnected) target.focus({preventScroll:true});
      else book.focus({preventScroll:true});
    });
  });

  // Russian spelling of a Latin name should still find it: «тиффани» → Tiffany, «ламборгини» → Lamborghini.
  const cyr = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
  const fold = s => s.toLowerCase().replace(/[а-яё]/g,ch => cyr[ch] ?? ch).replace(/gh/g,'g').replace(/ck/g,'k').replace(/c(?=[aou])/g,'k').replace(/ph/g,'f').replace(/w/g,'v').replace(/x/g,'ks').replace(/[yj]/g,'i').replace(/[^a-z0-9]/g,'').replace(/(.)\1+/g,'$1');
  function renderContents() {
    const query = $('#collection-search').value.trim().toLowerCase();
    const digits = query.match(/\d+/)?.[0];
    const nameQuery = query.replace(/\d+/g,'').trim(), folded = fold(nameQuery);
    const matches = collections.flatMap(c => {
      const names = [c.name.toLowerCase(),...(aliases[c.name] || [])];
      if (nameQuery && !names.some(n => n.includes(nameQuery)) && !(folded && fold(c.name).includes(folded)) && !c.cat.toLowerCase().includes(nameQuery)) return [];
      const shade = digits ? c.shades.find(s => Number(s.label) === Number(digits)) : null;
      if (digits && !shade) return [];
      return [{c,shade}];
    });
    const grouped = !query;
    $('#contents-list').innerHTML = matches.length ? matches.map(({c,shade},i) => `${grouped && (i === 0 || matches[i - 1].c.chapter !== c.chapter) ? `<p class="contents-group">${esc(chapters[c.chapter].title)} <span>${chapters[c.chapter].count}</span></p>` : ''}<button type="button" class="contents-row" data-collection="${pageOf(c)}"${shade ? ` data-target-shade="${esc(shade.label)}"` : ''} aria-current="${pageOf(c) === state.index}" aria-label="Открыть ${esc(c.name)}${shade ? ' ' + esc(shade.label) : ''}"><img src="${esc(shade ? shade.draped || shade.flat : shadeFor(c).thumb)}" alt="" loading="lazy"><span class="row-copy"><strong>${esc(c.name)}</strong><small>${esc(c.cat)} · ${c.shades.length} ${plural(c.shades.length,SHADES)}${shade ? ` · открыть ${esc(shade.label)}` : ''}</small></span>${icon('arrow')}</button>`).join('') : '<p class="empty-state">Такой коллекции или оттенка в альбоме нет.<br>Попробуйте название латиницей или по-русски: Brabus, «тиффани».</p>';
  }
  $('#contents-open').addEventListener('click',e => {
    $('#collection-search').value = '';renderContents();openDialog($('#contents'),e.currentTarget);$('#collection-search').focus();
  });
  $('#collection-search').addEventListener('input',renderContents);
  $('#collection-search').addEventListener('keydown',e => {
    if (e.key === 'Enter' && $$('[data-collection]',$('#contents-list')).length === 1) {
      e.preventDefault();e.stopPropagation();
      $('[data-collection]',$('#contents-list')).click();
    }
  });
  $('#contents-list').addEventListener('click',e => {
    const b = e.target.closest('[data-collection]');
    if (!b) return;
    const target = Number(b.dataset.collection);
    $('#contents').close();
    if (b.dataset.targetShade) state.selected[pages[target].c.name] = b.dataset.targetShade;
    if (target === state.index) { updateScene();renderBook(); } else navigate(target);
    book.scrollIntoView({block:'start',behavior:'auto'});
  });

  function openSaved(i) {
    const item = state.samples[i];
    if (!item) return;
    state.selected[item.name] = item.label;
    navigate(pageOf(collections.find(c => c.name === item.name)));
  }
  function removeSample(i) {
    const item = state.samples[i];
    if (!item) return;
    state.samples.splice(i,1);persist();updateScene();renderBook();updateNavigation();
    const removers = $$('[data-remove]',spread);
    (removers[Math.min(i,removers.length - 1)] || $('[data-page]',spread))?.focus({preventScroll:true});
    toast(`${item.name} ${item.label} убран из подборки`);
  }
  async function sendList(viber) {
    const text = 'Здравствуйте! Хочу заказать образцы тканей Fabric’s:\n' + sampleItems().map(({c,s}) => `${c.name} ${s.label} (${c.cat})`).join('\n');
    const status = $('[data-copy-status]',spread), fallback = $('.copy-fallback',spread);
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = viber ? 'Список скопирован. На новом сайте эта кнопка откроет Viber с готовым сообщением менеджеру.' : 'Список скопирован — его можно вставить в сообщение.';
    } catch {
      fallback.hidden = false;$('textarea',fallback).value = text;$('textarea',fallback).focus();$('textarea',fallback).select();
      status.textContent = 'Выделенный список можно скопировать вручную.';
    }
  }
  $('#samples-open').addEventListener('click',() => {
    if (state.index === lastPage) book.scrollIntoView({block:'start',behavior:'auto'});
    else navigate(lastPage);
  });

  const viewer = window.ALBUM_VIEWER.init({current,shadeFor,selectShade:label => selectShade(label),view:c => state.views[c.name]});
  function openZoom(trigger) { if (current() && !state.turn) viewer.open(trigger); }
  $('.brand').addEventListener('click',e => { e.preventDefault();if (state.index === 0) book.scrollIntoView({block:'start'});else navigate(0); });
  window.addEventListener('hashchange',() => {
    if(state.introActive)return;
    const target = pageForHash(location.hash);
    if (target >= 0) navigate(target);
  });
  function finishMotion() { if (state.turn) { state.turn.commit = true;state.turn.finish(); } }
  smallScreen.addEventListener('change',finishMotion);
  reducedMotion.addEventListener('change',e => { if (e.matches) finishMotion(); });
  document.addEventListener('visibilitychange',() => { if (document.hidden) finishMotion(); });
  $('#intro-count').innerHTML = `${collections.length} ${plural(collections.length,COLLECTIONS)} <span>·</span> ${totalShades} ${plural(totalShades,SHADES)}`;
  updateScene();renderBook();updateNavigation();preload(state.index + 1);setURL();
  const foil = coverFabric.shades.find(s => s.label === '14');
  window.ALBUM_INTRO.init({
    book,spread,pageForHash,cover:foil.flat,
    // Only what the opening shows: the cover, its drape behind the book and the contents samples.
    sources:[foil.flat,foil.draped,...collections.map(c => shadeFor(c).thumb)],
    firstScene(options){ window.ALBUM_SCENE.setCollection(...sceneFor(pages[0]),options); },
    complete(index=0,immediate=false){
      // Skipping goes straight to the linked collection; a full opening shows the contents first.
      state.introActive=false;state.index=index||(immediate?deepTarget:0);renderBook();updateNavigation();setURL();updateScene(immediate?{duration:0}:undefined);
      if(deepTarget&&!immediate&&!index)setTimeout(()=>{if(state.index===0)navigate(deepTarget);},400);
    },
    coverTurn(cover,options){
      return window.ALBUM_TURN_PHYSICS.create({host:book,front:clonePage(cover),back:clonePage(spread.firstElementChild),forward:true,...options});
    }
  });
})();

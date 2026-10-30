// Живая главная варианта 1: появление при прокрутке, «досчитывание» цифр, меню и поиск на телефоне, поле поиска
// в шапке на компьютере, подсказки вместо страниц, которых в демонстрации нет. Подключается к наброску
// build/v1b_home.html сборкой live_v1_build.py. На каждый кадр прокрутки скрипт ничего не двигает (урок iPhone).
(() => {
  'use strict';
  const doc = document.documentElement, body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let enabled = doc.classList.contains('motion');

  // разделы — якоря для меню и ссылок
  body.id = 'top';
  for (const [id, sel] of Object.entries({ kinds: '.kinds', tasks: '.tasks', news: '.news', inuse: '.inuse', dealers: '.dealers', contacts: '.ftr' })) {
    const el = $(sel);
    if (el) el.id = id;
  }

  // подсказка вместо страниц, которых в демонстрации нет
  const toast = document.createElement('div');
  toast.className = 'demo-toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.innerHTML = '<p></p><div class="demo-toast-acts"><a href="../">Открыть наброски</a><button type="button">Закрыть</button></div>';
  body.append(toast);
  let toastTimer = 0;
  const say = text => {
    $('p', toast).textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 9000);
  };
  $('button', toast).addEventListener('click', () => { toast.hidden = true; });

  const LATER = 'Эта страница — следующим шагом: живой в демонстрации сделана только главная. Экраны коллекции и подбора — в набросках варианта 1.';
  const collectionText = name => `Страница коллекции ${name} — в набросках варианта 1 (на примере Betsy): живой в демонстрации сделана только главная.`;
  const ROUTES = {
    'Ткани': '#kinds', 'Подбор ткани': '#tasks', 'Где купить': '#dealers', 'Мебельщикам': '#dealers', 'Подобрать ткань': '#tasks', 'Каталог': '#kinds',
    'Велюр': '#kinds', 'Замша': '#kinds', 'Рогожка': '#kinds', 'Экокожа': '#kinds', 'Искусственный мех': '#kinds', 'Шенилл': '#kinds', 'Премиум': '#kinds',
    'info@ffm.by': 'mailto:info@ffm.by', '+375 29 625 99 65': 'tel:+375296259965',
  };
  const SAYS = {
    'Вход для дилеров': 'Кабинет дилера — второй заказ: наличие на складе и заказ без звонков.',
    'Подобрать за 3 вопроса': 'Подбор за три вопроса — в набросках варианта 1: «Где будет мебель», «Что важно», «Какая ткань».',
    'Найти дилера': 'Карта дилеров с адресами — следующим шагом.',
    'Стать партнёром': 'Форма для мебельных фабрик — следующим шагом.',
    'Instagram': 'Ссылка на Instagram Fabric\'s появится на сайте.',
  };
  const demo = (a, text) => { a.setAttribute('href', '../'); a.dataset.say = text; };
  $$('a:not([href])').forEach(a => {
    const t = a.textContent.trim();
    if (a.classList.contains('logo')) return a.setAttribute('href', '#top');
    if (a.classList.contains('tile')) return demo(a, `Раздел «${$('b', a).textContent}» (${$('span', a).textContent}) — следующим шагом. Экраны коллекции и подбора — в набросках варианта 1.`);
    if (a.classList.contains('card')) return demo(a, collectionText($('.nm', a).textContent));
    if (a.classList.contains('task')) return demo(a, `Подбор «${$('b', a).textContent}» — ${$('em', a).textContent}. Как устроен подбор — в набросках варианта 1.`);
    if (SAYS[t]) return demo(a, SAYS[t]);
    if (ROUTES[t]) return a.setAttribute('href', ROUTES[t]);
    return demo(a, LATER);
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-say]');
    if (!a) return;
    e.preventDefault();
    say(a.dataset.say);
  });

  // поиск по коллекциям демонстрации; «Brabus 25» — номер оттенка отбрасывается
  const COLL = [['Brabus', 'Велюр · 30 оттенков'], ['Betsy', 'Шенилл · 15 оттенков'], ['Festa', 'Шенилл · 6 оттенков'], ['Favorit FL', 'Шенилл · 5 оттенков'],
    ['Comfort FL', 'Шенилл · 5 оттенков'], ['Lucky', 'Шенилл · 19 оттенков'], ['Lagundi', 'Премиум · 19 оттенков']];
  function fill(list, value) {
    list.replaceChildren();
    const query = value.trim().toLowerCase().replace(/\s+\d+$/, '');
    list.hidden = !value.trim();
    if (!query) return;
    const hits = COLL.filter(([n]) => n.toLowerCase().includes(query));
    if (!hits.length) {
      const li = document.createElement('li');
      li.className = 'none';
      li.textContent = 'В демонстрации — Brabus, Betsy, Festa, Favorit FL, Comfort FL, Lucky и Lagundi.';
      list.append(li);
      return;
    }
    for (const [n, k] of hits) {
      const li = document.createElement('li'), a = document.createElement('a'), b = document.createElement('b'), s = document.createElement('span');
      b.textContent = n;
      s.textContent = k;
      a.append(b, s);
      demo(a, collectionText(n));
      li.append(a);
      list.append(li);
    }
  }
  const SEARCH_SVG = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  const makeInput = () => {
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Название или номер: Brabus 25';
    input.setAttribute('aria-label', 'Название коллекции или номер оттенка');
    input.autocomplete = 'off';
    return input;
  };

  // компьютер: надпись в шапке становится полем поиска с подсказками
  const label = $('.hdr label.search');
  if (label) {
    const box = document.createElement('div');
    box.className = label.className;
    box.innerHTML = SEARCH_SVG;
    const input = makeInput(), list = document.createElement('ul');
    list.className = 'sr';
    list.hidden = true;
    box.append(input, list);
    label.replaceWith(box);
    box.addEventListener('click', e => { if (!e.target.closest('a')) input.focus(); });
    input.addEventListener('input', () => fill(list, input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; fill(list, ''); }
      if (e.key === 'Enter') { e.preventDefault(); $('a', list)?.click(); }
    });
    document.addEventListener('click', e => { if (!box.contains(e.target)) list.hidden = true; });
  }

  // телефон: значки поиска и меню становятся кнопками
  const toButton = (span, name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hide-d icon-btn';
    b.setAttribute('aria-label', name);
    b.append(...span.childNodes);
    span.replaceWith(b);
    return b;
  };
  const [searchIcon, menuIcon] = $$('.hdr .icons > span.hide-d');
  if (searchIcon) {
    const btn = toButton(searchIcon, 'Поиск ткани');
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.hidden = true;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Поиск ткани');
    sheet.innerHTML = `<div class="row">${SEARCH_SVG}</div><ul class="sr" hidden></ul>`;
    const input = makeInput(), close = document.createElement('button');
    close.type = 'button';
    close.className = 'sheet-close';
    close.textContent = 'Закрыть';
    $('.row', sheet).append(input, close);
    body.append(sheet);
    const list = $('ul', sheet);
    const hide = () => { sheet.hidden = true; btn.focus(); };
    btn.addEventListener('click', () => { sheet.hidden = false; input.focus(); });
    close.addEventListener('click', hide);
    input.addEventListener('input', () => fill(list, input.value));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) hide(); });
  }
  if (menuIcon) {
    const btn = toButton(menuIcon, 'Открыть меню');
    btn.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('aside');
    menu.className = 'mobile-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Навигация');
    menu.innerHTML = '<button class="menu-close" type="button" aria-label="Закрыть меню">×</button><p class="menu-caption">Fabric&#39;s · мебельные ткани</p>'
      + '<nav><a href="#kinds">Виды тканей</a><a href="#tasks">Под вашу задачу</a><a href="#news">Новинки</a><a href="#inuse">Ткани в мебели</a>'
      + '<a href="#dealers">Образцы вживую</a><a href="#contacts">Контакты</a></nav>';
    body.append(menu);
    const closeBtn = $('.menu-close', menu);
    const hide = focus => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); };
    btn.addEventListener('click', () => { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); closeBtn.focus(); });
    closeBtn.addEventListener('click', () => hide(true));
    $$('a', menu).forEach(a => a.addEventListener('click', () => hide(false)));
    document.addEventListener('keydown', e => {
      if (menu.hidden) return;
      if (e.key === 'Escape') hide(true);
      if (e.key === 'Tab') {
        const f = $$('button,a[href]', menu), first = f[0], last = f.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !toast.hidden) toast.hidden = true; });

  // шапка: тень, когда страница прокручена (наблюдатель за меткой в начале страницы, без обработчика прокрутки)
  const mark = document.createElement('div');
  mark.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
  body.prepend(mark);
  const hdr = $('.hdr');
  new IntersectionObserver(([e]) => hdr.classList.toggle('scrolled', !e.isIntersecting)).observe(mark);

  // появление при прокрутке: один раз, по очереди внутри группы
  const items = [];
  const group = (sel, step = 0.07, max = 0.42) => $$(sel).forEach((el, i) => {
    el.classList.add('rv');
    el.style.setProperty('--d', Math.min(i * step, max).toFixed(2) + 's');
    items.push(el);
  });
  group('.intro .h2'); group('.intro p'); group('.stats > div', 0.1);
  group('.kinds .sec-h'); group('.tile', 0.06);
  group('.tasks .kicker'); group('.tasks .h2'); group('.task', 0.08); group('.tasks .btn');
  group('.news .sec-h'); group('.news .card', 0.07);
  group('.inuse .sec-h'); group('.gallery figure', 0.08);
  group('.dealers-in > div', 0.12);
  const tasksImg = $('.tasks-img');
  if (tasksImg) items.push(tasksImg);

  function count(b) {
    const end = +b.textContent;
    if (!enabled || !end) return;
    const t0 = performance.now(), dur = 1100;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      b.textContent = p < 1 ? String(Math.round(end * (1 - Math.pow(1 - p, 3)))) : String(end);
      if (p < 1) requestAnimationFrame(tick);
    };
    b.textContent = '0';
    requestAnimationFrame(tick);
  }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
    if (e.target.matches('.stats > div')) count($('b', e.target));
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  items.forEach(el => io.observe(el));

  // переключатель движения и «наверх»
  const tools = document.createElement('div');
  tools.className = 'motion-tools';
  tools.setAttribute('aria-label', 'Настройки демонстрации');
  tools.innerHTML = '<button type="button" id="motion-toggle"></button><button class="to-top" type="button" aria-label="Вернуться к началу">↑</button>';
  body.append(tools);
  const toggle = $('#motion-toggle', tools);
  function setMotion(value) {
    enabled = value && !reduced.matches;
    doc.classList.toggle('motion', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.innerHTML = '<span class="motion-dot" aria-hidden="true"></span><span class="mt-text">Движение: ' + (enabled ? 'вкл.' : 'выкл.') + '</span>';
    toggle.setAttribute('aria-label', 'Движение при появлении: ' + (enabled ? 'включено' : 'выключено'));
    toggle.disabled = reduced.matches;
  }
  toggle.addEventListener('click', () => setMotion(!enabled));
  reduced.addEventListener('change', () => setMotion(!reduced.matches));
  $('.to-top', tools).addEventListener('click', () => scrollTo({ top: 0, behavior: enabled ? 'smooth' : 'instant' }));
  setMotion(enabled);
})();

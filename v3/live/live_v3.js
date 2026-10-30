// Живая главная варианта 3 «Палитра»: стена из всех оттенков собирается при открытии, кресло-мозаика — при прокрутке;
// цвет кресла переключается; у каждого квадрата — название и номер (наведение мышью, нажатие пальцем); меню и поиск
// на телефоне, поле поиска в шапке, подсказки вместо страниц, которых в демонстрации нет. Подключается к наброску
// build/v3_home.html сборкой live_v3_build.py; данные палитры — в самой странице (#pal-data).
// На каждый кадр прокрутки скрипт ничего не двигает (урок iPhone, 30.10.2026).
(() => {
  'use strict';
  const doc = document.documentElement, body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const roomy = matchMedia('(min-width: 1181px)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = JSON.parse($('#pal-data').textContent);
  let enabled = doc.classList.contains('motion');

  const plural = (n, a, b, c) => { const d = n % 10, h = n % 100; return d === 1 && h !== 11 ? a : d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c; };
  const nShade = n => `${n} ${plural(n, 'оттенок', 'оттенка', 'оттенков')}`;
  const ofN = (n, one, many) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? one : many}`;
  const shade = n => { const [coll, label, k] = D.shades[n]; return { coll, label, kind: D.kinds[k], name: `${coll} ${label}` }; };
  const layout = () => 'd'; // одна стена 41 x 21 на всех экранах; на телефоне её листают вбок
  const WALL = { d: 'assets/palette/wall_d.jpg' };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // квадрат образца из картинки стены (та же картинка, что на первом экране, — без лишних загрузок)
  const swatch = (el, n) => {
    const key = layout(), L = D.walls[key], [c, r] = D.pos[key][n];
    el.style.backgroundImage = `url(${WALL[key]})`;
    el.style.backgroundSize = `${L.cols * 100}% ${L.rows * 100}%`;
    el.style.backgroundPosition = `${c * 100 / (L.cols - 1)}% ${r * 100 / (L.rows - 1)}%`;
  };

  // разделы — якоря для меню и ссылок
  body.id = 'top';
  for (const [id, sel] of Object.entries({ colors: '.bycolor', collections: '.hangers', macro: '.macro', tasks: '.tasks3', dealers: '.dealers', contacts: '.ftr' })) {
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

  const LATER = 'Эта страница — следующим шагом: живой в демонстрации сделана только главная. Экраны коллекции и подбора — в набросках варианта 3.';
  const collectionText = name => name === 'Betsy'
    ? 'Страница коллекции Betsy — в набросках варианта 3: оттенки крупно, сравнение рядом, похожий цвет в других коллекциях.'
    : `Страница коллекции ${name} — в набросках варианта 3 (на примере Betsy): живой в демонстрации сделана только главная.`;
  const SELECT = 'Подбор по цвету и задаче — в набросках варианта 3: сначала цвет, потом где будет мебель, — и сразу подходящие оттенки из всех коллекций.';
  const ROUTES = {
    'Ткани': '#collections', 'Цвета': '#colors', 'Где купить': '#dealers', 'Мебельщикам': '#dealers', 'Подобрать по цвету': '#colors', 'Каталог': '#collections',
    'Велюр': '#collections', 'Замша': '#collections', 'Рогожка': '#collections', 'Экокожа': '#collections', 'Искусственный мех': '#collections', 'Шенилл': '#collections', 'Премиум': '#collections',
    'info@ffm.by': 'mailto:info@ffm.by', '+375 29 625 99 65': 'tel:+375296259965',
  };
  const SAYS = {
    'Подбор ткани': SELECT,
    'Вход для дилеров': 'Кабинет дилера — второй заказ: наличие на складе и заказ без звонков.',
    'Найти дилера': 'Карта дилеров с адресами — следующим шагом. Цвет на экране может отличаться от ткани: перед заказом образец сверяют вживую.',
    'Стать партнёром': 'Форма для мебельных фабрик — следующим шагом.',
    'Instagram': 'Ссылка на Instagram Fabric\'s появится на сайте.',
  };
  const demo = (a, text) => { a.setAttribute('href', '../'); a.dataset.say = text; };

  // выбор цвета — кнопки, а не ссылки
  const chips = $$('.chip').map(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = a.className;
    b.dataset.fam = a.dataset.fam;
    b.setAttribute('aria-pressed', String(a.classList.contains('on')));
    b.setAttribute('aria-label', `${$('span', a).textContent}: ${nShade(+$('em', a).textContent)}`);
    b.append(...a.childNodes);
    a.replaceWith(b);
    return b;
  });

  $$('a:not([href])').forEach(a => {
    const t = a.textContent.trim();
    if (a.classList.contains('logo')) return a.setAttribute('href', '#top');
    if (a.classList.contains('mine')) return demo(a, `${a.title}. Собранные оттенки отправляются списком в Viber — заработает на следующем этапе.`);
    if (a.classList.contains('hanger')) return demo(a, collectionText($('b', a).textContent));
    if (a.parentElement.classList.contains('kinds')) {
      const n = +$('em', a).textContent;
      return demo(a, `${a.firstChild.textContent.trim() === 'Все' ? 'Весь каталог' : `Раздел «${a.firstChild.textContent.trim()}»`} — ${ofN(n, 'коллекция', plural(n, 'коллекция', 'коллекции', 'коллекций'))} — следующим шагом. Экраны коллекции и подбора — в набросках варианта 3.`);
    }
    if (a.classList.contains('fam-all')) return demo(a, '');
    if (a.closest('.macro-tag')) return demo(a, collectionText('Betsy'));
    if (a.classList.contains('tcard')) return demo(a, `Подбор «${$('b', a).textContent}» — ${$('em', a).textContent}. ${SELECT}`);
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

  // поиск по всем коллекциям каталога: «Brabus 25» — оттенок с квадратом; русские буквы — латиницей («брабус»)
  const LAT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  const norm = s => [...s.toLowerCase()].map(ch => LAT[ch] ?? ch).join('').replace(/y/g, 'i').replace(/\s+/g, ' ');
  function fill(list, value) {
    list.replaceChildren();
    const raw = value.trim();
    list.hidden = !raw;
    if (!raw) return;
    const [, text, num] = raw.match(/^(.*?)\s*(\d+)?$/);
    const q = norm(text.trim());
    const hits = q ? D.colls.filter(([n]) => norm(n).includes(q)).slice(0, 7) : [];
    if (!hits.length) {
      const li = document.createElement('li');
      li.className = 'none';
      li.textContent = `«${raw}» не нашли. Проверьте название или откройте весь каталог — ${D.colls.length} коллекции.`;
      list.append(li);
      return;
    }
    for (const [name, kind, cnt] of hits) {
      const li = document.createElement('li'), a = document.createElement('a'), b = document.createElement('b'), s = document.createElement('span');
      const n = num ? D.shades.findIndex(([c, l]) => c === name && (l === num || l.replace(/^0+/, '') === num.replace(/^0+/, ''))) : -1;
      if (n >= 0) {
        const i = document.createElement('i');
        swatch(i, n);
        a.append(i);
        b.textContent = `${name} ${D.shades[n][1]}`;
        s.textContent = kind.toLowerCase();
        demo(a, `${name} ${D.shades[n][1]} — ${kind.toLowerCase()}. ${collectionText(name)}`);
      } else {
        b.textContent = name;
        s.textContent = `${kind} · ${nShade(cnt)}`;
        demo(a, collectionText(name));
      }
      a.append(b, s);
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

  // панель поиска сверху — на телефоне и на ноутбуке, где в шапке только значок
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Поиск ткани');
  sheet.innerHTML = `<div class="row">${SEARCH_SVG}</div><ul class="sr" hidden></ul>`;
  const sheetInput = makeInput(), sheetClose = document.createElement('button');
  sheetClose.type = 'button';
  sheetClose.className = 'sheet-close';
  sheetClose.textContent = 'Закрыть';
  $('.row', sheet).append(sheetInput, sheetClose);
  body.append(sheet);
  let sheetOpener = null;
  const openSheet = opener => { sheetOpener = opener; sheet.hidden = false; sheetInput.focus(); };
  const hideSheet = () => { sheet.hidden = true; sheetOpener?.focus(); };
  sheetClose.addEventListener('click', hideSheet);
  sheetInput.addEventListener('input', () => fill($('ul', sheet), sheetInput.value));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) hideSheet(); });

  // компьютер: надпись в шапке становится полем поиска с подсказками
  const label = $('.hdr label.search');
  if (label) {
    const box = document.createElement('div');
    box.className = label.className;
    box.setAttribute('role', 'search');
    box.innerHTML = SEARCH_SVG;
    const input = makeInput(), list = document.createElement('ul');
    list.className = 'sr';
    list.hidden = true;
    box.append(input, list);
    label.replaceWith(box);
    box.addEventListener('click', e => {
      if (!roomy.matches) { e.preventDefault(); openSheet(box); return; }
      if (!e.target.closest('a')) input.focus();
    });
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
    b.className = 'm-icon icon-btn';
    b.setAttribute('aria-label', name);
    b.append(...span.childNodes);
    span.replaceWith(b);
    return b;
  };
  const [searchIcon, menuIcon] = $$('.hdr .tools > span.m-icon');
  if (searchIcon) {
    const btn = toButton(searchIcon, 'Поиск ткани');
    btn.addEventListener('click', () => openSheet(btn));
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
      + '<nav><a href="#colors">Выбор по цвету</a><a href="#collections">Коллекции</a><a href="#macro">Ткань крупным планом</a><a href="#tasks">Под вашу задачу</a>'
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

  // шапка: лёгкая тень, когда страница прокручена (наблюдатель за меткой в начале страницы, без обработчика прокрутки)
  const mark = document.createElement('div');
  mark.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
  body.prepend(mark);
  const hdr = $('.hdr');
  new IntersectionObserver(([e]) => hdr.classList.toggle('scrolled', !e.isIntersecting)).observe(mark);

  // название и номер образца: ярлык у указателя мыши и рамка вокруг квадрата; пальцем — подсказка внизу
  const tip = document.createElement('div');
  tip.className = 'pick-tip';
  tip.hidden = true;
  tip.setAttribute('aria-hidden', 'true');
  body.append(tip);
  const showTip = (n, e) => {
    const s = shade(n), sub = document.createElement('span');
    sub.textContent = `${s.kind.toLowerCase()} · нажмите, чтобы открыть`;
    tip.replaceChildren(s.name, sub);
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = e.clientX + 16, y = e.clientY + 18;
    if (x + tw > innerWidth - 8) x = e.clientX - tw - 12;
    if (y + th > innerHeight - 8) y = e.clientY - th - 12;
    tip.style.transform = `translate(${x}px,${y}px)`;
  };
  const pickSay = n => { const s = shade(n); say(`${s.name} — ${s.kind.toLowerCase()}. ${collectionText(s.coll)}`); };

  const wall = $('.wall'), wimg = $('.wall img');
  const hl = document.createElement('i');
  hl.className = 'pick-hl';
  hl.hidden = true;
  wall.append(hl);
  const hideWall = () => { tip.hidden = true; hl.hidden = true; };
  const wallCell = e => {
    const r = wimg.getBoundingClientRect(), key = layout(), L = D.walls[key];
    const c = Math.floor((e.clientX - r.left) / r.width * L.cols), row = Math.floor((e.clientY - r.top) / r.height * L.rows);
    if (c < 0 || row < 0 || c >= L.cols || row >= L.rows) return null;
    const w = r.width / L.cols, h = r.height / L.rows;
    hl.style.cssText = `left:${c * w}px;top:${row * h}px;width:${w}px;height:${h}px`;
    hl.hidden = false;
    return D.grid[key][row * L.cols + c];
  };
  wall.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const n = wallCell(e);
    n == null ? hideWall() : showTip(n, e);
  });
  wall.addEventListener('pointerleave', hideWall);
  wall.addEventListener('click', e => {
    const n = wallCell(e);
    if (n != null) pickSay(n);
  });

  // стена собирается при открытии: полоски по 3–7 квадратов падают на место снизу вверх (компьютер, мышь);
  // на сенсорном экране ряды проявляются средствами браузера (base: live_v3.css), без сдвига
  let buildBox = null;
  function buildWall() {
    if (!enabled || coarse.matches || doc.classList.contains('intro-done')) { wall.classList.add('done'); return; }
    const L = D.walls[layout()], r = wimg.getBoundingClientRect();
    if (!r.width || !r.height) { wall.classList.add('done'); return; }
    const W = r.width, H = r.height, cw = W / L.cols, ch = H / L.rows, src = wimg.currentSrc || wimg.src, STEP = 0.055;
    buildBox = document.createElement('div');
    buildBox.className = 'wall-build';
    for (let row = 0; row < L.rows; row++) {
      for (let c = 0; c < L.cols;) {
        const len = Math.min(L.cols - c, 3 + Math.floor(rnd() * 5));
        const seg = document.createElement('i');
        seg.style.cssText = `left:${c * cw}px;top:${row * ch}px;width:${len * cw + .5}px;height:${ch + .5}px;background-image:url("${src}");`
          + `background-size:${W}px ${H}px;background-position:${-c * cw}px ${-row * ch}px`;
        seg.style.setProperty('--d', ((L.rows - 1 - row) * STEP + rnd() * .14).toFixed(3) + 's');
        seg.style.setProperty('--fall', -Math.round(70 + rnd() * 130) + 'px');
        buildBox.append(seg);
        c += len;
      }
    }
    wall.append(buildBox);
    setTimeout(() => { wall.classList.add('done'); buildBox?.remove(); buildBox = null; }, ((L.rows - 1) * STEP + .14 + .62) * 1000 + 80);
  }
  if (wimg.complete && wimg.naturalWidth) buildWall();
  else wimg.addEventListener('load', buildWall, { once: true });

  // кресло-мозаика: цвет переключается, клетки падают на место снизу вверх (на сенсорном экране — ряды проявляются)
  const chair = $('.chair');
  const cellsEl = [...chair.children];
  const h2 = $('.bc-head .h2'), cap = $('.bc-head .cap'), famAll = $('.fam-all'), chipSel = $('.chip-sel');
  const arrow = $('svg', famAll).outerHTML;
  const famStat = key => {
    const used = [...new Set(D.fills[key].filter(n => n >= 0))];
    return { n: used.length, colls: new Set(used.map(n => D.shades[n][0])).size };
  };
  function paint(key) {
    D.fills[key].forEach((n, i) => {
      if (n < 0) return;
      const el = cellsEl[i], [dc, dr] = D.pos.d[n];
      el.dataset.n = n;
      el.style.setProperty('--dc', dc);
      el.style.setProperty('--dr', dr);
    });
    chair.dataset.fam = key;
    const st = famStat(key), f = D.fams[key];
    h2.textContent = `Кресло из ${ofN(st.n, 'оттенка', 'оттенков')}`;
    const b = document.createElement('b');
    b.className = 'fam-t';
    b.textContent = f.title;
    cap.replaceChildren(b, ` из ${ofN(st.colls, 'коллекции', 'коллекций')}. Каждый квадрат — настоящий образец: ${coarse.matches ? 'нажмите' : 'наведите'} — увидите название и номер.`);
    famAll.innerHTML = `Все ${f.title.toLowerCase()} — ${nShade(f.n)} ${arrow}`;
    famAll.dataset.say = `Все ${f.title.toLowerCase()} — ${nShade(f.n)}: страница цвета — следующим шагом. ${SELECT}`;
    if (chipSel) chipSel.textContent = `${f.title} · ${nShade(f.n)}`;
    chips.forEach(c => { const on = c.dataset.fam === key; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
  }
  let dropTimer = 0;
  function dropChair() {
    chair.classList.remove('pre', 'drop');
    if (!enabled) return;
    if (!coarse.matches) cellsEl.forEach((el, i) => {
      el.style.setProperty('--d', ((15 - D.cells[i][1]) * .05 + rnd() * .12).toFixed(3) + 's');
      el.style.setProperty('--fall', -Math.round(50 + rnd() * 90) + 'px');
    });
    void chair.offsetWidth; // перезапуск анимации
    chair.classList.add('drop');
    clearTimeout(dropTimer);
    dropTimer = setTimeout(() => chair.classList.remove('drop'), 1700);
  }
  paint(chair.dataset.fam);
  chips.forEach(c => c.addEventListener('click', () => { paint(c.dataset.fam); dropChair(); }));
  if (enabled) {
    chair.classList.add('pre');
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      dropChair();
    }, { threshold: .3 });
    io.observe(chair);
  }
  chair.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('i[data-n]');
    el ? showTip(+el.dataset.n, e) : (tip.hidden = true);
  });
  chair.addEventListener('pointerleave', () => { tip.hidden = true; });
  chair.addEventListener('click', e => {
    const el = e.target.closest('i[data-n]');
    if (el) pickSay(+el.dataset.n);
  });

  // появление при прокрутке: один раз, по очереди внутри группы
  const items = [];
  const group = (sel, step = 0.07, max = 0.42) => $$(sel).forEach((el, i) => {
    el.classList.add('rv');
    el.style.setProperty('--d', Math.min(i * step, max).toFixed(2) + 's');
    items.push(el);
  });
  group('.bc-head'); group('.bc-pick');
  group('.hangers .sec-h'); group('.kinds'); group('.hanger', 0.06);
  group('.macro-tag');
  group('.tasks3 .sec-h'); group('.tcard', 0.08);
  group('.dealers-in > div', 0.12);
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
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
    if (!enabled) {
      buildBox?.remove();
      buildBox = null;
      wall.classList.add('done');
      chair.classList.remove('pre', 'drop');
    }
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.innerHTML = '<span class="motion-dot" aria-hidden="true"></span><span class="mt-text">Движение: ' + (enabled ? 'вкл.' : 'выкл.') + '</span>';
    toggle.setAttribute('aria-label', 'Сборка и появление при прокрутке: ' + (enabled ? 'включены' : 'выключены'));
    toggle.disabled = reduced.matches;
  }
  toggle.addEventListener('click', () => setMotion(!enabled));
  reduced.addEventListener('change', () => setMotion(!reduced.matches));
  coarse.addEventListener('change', () => doc.classList.toggle('coarse', coarse.matches));
  $('.to-top', tools).addEventListener('click', () => scrollTo({ top: 0, behavior: enabled ? 'smooth' : 'instant' }));
  setMotion(enabled);
})();

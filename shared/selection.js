(() => {
  'use strict';
  const assetBase = new URL('.', document.currentScript.src);
  const data = window.FFM_COLLECTIONS;
  const variant = document.body.dataset.ffmVariant;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const src = s => new URL(s, assetBase).href;
  const same = (a,b) => String(a).replace(/^0+/, '') === String(b).replace(/^0+/, '');
  let current, index = 0, photoMode = 'draped', board = [];
  const storageKey = 'ffm-samples-' + variant;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) board = stored.filter(x => data.some(c => c.name === x.name && c.shades.some(s => s.label === x.label))).filter((x,i,a)=>a.findIndex(y=>y.name===x.name&&y.label===x.label)===i).map(x=>({name:x.name,label:x.label}));
  } catch { /* A private browser session can keep the selection in memory. */ }

  const dock = document.createElement('button');
  dock.type = 'button'; dock.className = 'ffm-sample-dock'; dock.dataset.samples = '';
  dock.innerHTML = 'Мои образцы <span data-sample-count>0</span> <span aria-hidden="true">↗︎</span>';
  document.body.append(dock);
  // Один счётчик образцов на экране: пока виден счётчик в шапке или футер, плавающая плашка спрятана
  // (иначе на странице два «Мои образцы», а внизу плашка закрывает строки футера).
  // Счётчик в шапке страницы варианта может появиться позже этого скрипта — смотрим после загрузки разметки.
  const watchDock = () => {
    if (!('IntersectionObserver' in window)) return;
    const watched = [...document.querySelectorAll('header [data-samples], .topbar [data-samples], footer')];
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
      dock.classList.toggle('ffm-dock-off', seen.size > 0);
    });
    watched.forEach(el => io.observe(el));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchDock); else setTimeout(watchDock);
  // На телефоне первый экран без плавающих плашок: «Мои образцы» и «Движение» появляются, как только человек начал
  // листать (метка на 120 точек ниже верха страницы ушла из вида). Без обработчика прокрутки — правило iPhone.
  if ('IntersectionObserver' in window) {
    const mark = document.createElement('div');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText = 'position:absolute;top:120px;left:0;width:1px;height:1px;pointer-events:none';
    document.body.append(mark);
    new IntersectionObserver(([e]) => document.body.classList.toggle('ffm-scrolled', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(mark);
  }
  const detail = document.createElement('dialog');
  detail.id = 'ffm-detail'; detail.className = 'ffm-dialog ffm-detail';
  detail.setAttribute('aria-labelledby','ffm-name');
  detail.innerHTML = `<button class="ffm-close" type="button" data-ffm-close aria-label="Закрыть коллекцию">×</button>
    <div class="ffm-layout"><figure class="ffm-visual"><img id="ffm-photo" alt=""><figcaption><span id="ffm-photo-caption"></span><div class="ffm-photo-modes" role="group" aria-label="Вид фотографии"><button type="button" data-photo="draped">Драпировка</button><button type="button" data-photo="flat">Фактура</button></div></figcaption></figure>
    <section class="ffm-info"><div class="ffm-eyebrow">Коллекция мебельной ткани <span id="ffm-category"></span></div><h2 id="ffm-name"></h2><p id="ffm-description"></p>
    <label class="ffm-collection-label" for="ffm-collection">Выбрать коллекцию</label><select id="ffm-collection">${data.map(c=>`<option value="${esc(c.name)}">${esc(c.name)} · ${esc(c.cat)}</option>`).join('')}</select>
    <div class="ffm-palette-heading"><h3 id="ffm-shade-name" aria-live="polite"></h3><span id="ffm-shade-count"></span></div>
    <div id="ffm-shades" class="ffm-shades" role="group" aria-label="Оттенки коллекции"></div><p id="ffm-note" class="ffm-note"></p>
    <dl id="ffm-specs" class="ffm-specs"></dl><p id="ffm-catalog-link" class="ffm-catalog-link ffm-catalog-later">Полная страница коллекции — на новом сайте</p>
    <div class="ffm-actions"><button type="button" id="ffm-add" class="ffm-primary">Добавить образец +</button><button type="button" data-samples class="ffm-secondary">Мои образцы <span data-sample-count>0</span> ↗︎</button></div>
    <p class="ffm-footnote">Сохраните оттенки и скопируйте список для консультанта. Цвет ткани лучше сверить по образцу вживую.</p><p id="ffm-detail-status" class="ffm-status" role="status"></p></section></div>`;
  const samples = document.createElement('dialog');
  samples.id = 'ffm-board'; samples.className = 'ffm-dialog ffm-board';
  samples.setAttribute('aria-labelledby','ffm-board-title');
  samples.innerHTML = `<button class="ffm-close" type="button" data-ffm-close aria-label="Закрыть образцы">×</button><div class="ffm-board-content"><p class="ffm-eyebrow">Fabric’s · ваша подборка</p><h2 id="ffm-board-title">Мои образцы</h2><p class="ffm-board-intro">Соберите ткани для вашего проекта.</p><div id="ffm-board-empty"><p>В подборке пока нет образцов.</p><p>Откройте коллекцию, выберите оттенок и нажмите «Добавить образец».</p></div><ul id="ffm-board-items"></ul><button type="button" id="ffm-copy" class="ffm-primary">Скопировать список ↗︎</button><p id="ffm-copy-status" class="ffm-status" role="status"></p><textarea id="ffm-copy-fallback" readonly hidden aria-label="Список для копирования"></textarea><p class="ffm-footnote">Это демонстрационная подборка. Заявка не отправляется.</p></div>`;
  document.body.append(detail, samples);
  const dialogs = [detail, samples];
  let openCatalog;
  if(variant==='v1'||variant==='v2'){
    const catalog=document.createElement('dialog');
    catalog.id='ffm-catalog';catalog.className='ffm-dialog ffm-catalog';
    catalog.setAttribute('aria-labelledby','ffm-catalog-title');
    const categories=[...new Set(data.map(c=>c.cat))];
    catalog.innerHTML=`<button class="ffm-close" type="button" data-ffm-close aria-label="Закрыть каталог">×</button><div class="ffm-catalog-content"><p class="ffm-eyebrow">Fabric’s · мебельные ткани</p><h2 id="ffm-catalog-title">Каталог тканей</h2><p class="ffm-catalog-intro">От коллекции — к вашему оттенку.</p><label for="ffm-catalog-search">Найти ткань</label><input id="ffm-catalog-search" type="search" placeholder="Название или номер: Betsy 003" autocomplete="off"><div class="ffm-catalog-filters" role="group" aria-label="Вид ткани">${['all',...categories].map(cat=>`<button type="button" data-catalog-filter="${esc(cat)}" aria-pressed="${cat==='all'}">${esc(cat==='all'?'Все ткани':cat)}</button>`).join('')}</div><div class="ffm-catalog-summary"><h3 id="ffm-catalog-category">Все ткани</h3><p id="ffm-catalog-count" role="status"></p></div><div id="ffm-catalog-grid" class="ffm-catalog-grid"></div><div id="ffm-catalog-empty" hidden><p>Коллекций по этому запросу не нашли.</p><button type="button" id="ffm-catalog-reset">Показать все ткани</button></div></div>`;
    document.body.append(catalog);dialogs.push(catalog);
    let category='all';
    const letters={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
    const norm=s=>[...s.toLowerCase()].map(c=>letters[c]??c).join('').replace(/y/g,'i').trim();
    const quantity=(n,one,few,many)=>`${n} ${n%10===1&&n%100!==11?one:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?few:many}`;
    function renderCatalog(){
      const raw=$('#ffm-catalog-search').value.trim();
      const [,text,num]=raw.match(/^(.*?)\s*(\d+)?$/);
      const q=norm(text);
      const hits=data.filter(c=>(category==='all'||c.cat===category)&&(!q||norm(c.name+' '+c.cat).includes(q))&&(!num||c.shades.some(s=>same(s.label,num))));
      $('#ffm-catalog-category').textContent=category==='all'?'Все ткани':category;
      $('#ffm-catalog-count').textContent=quantity(hits.length,'коллекция','коллекции','коллекций')+' · '+quantity(hits.reduce((n,c)=>n+c.shades.length,0),'оттенок','оттенка','оттенков');
      $('#ffm-catalog-grid').innerHTML=hits.map(c=>{
        const shade=num?c.shades.find(s=>same(s.label,num)):null;
        return `<button type="button" class="ffm-catalog-card" data-collection="${esc(c.name)}" ${shade?`data-shade="${esc(shade.label)}"`:''} aria-label="Открыть ${esc(c.name+(shade?' '+shade.label:''))}"><span class="ffm-catalog-photo"><img src="${src(shade?shade.draped||shade.flat:c.photo||c.shades[0].flat)}" alt="${esc(c.name)} — ${esc(c.cat.toLowerCase())}" loading="lazy"><span aria-hidden="true">Оттенки ↗︎</span></span><span class="ffm-catalog-card-name">${esc(c.name+(shade?' '+shade.label:''))}</span><span class="ffm-catalog-card-meta">${esc(c.cat)} · ${quantity(c.shades.length,'оттенок','оттенка','оттенков')}</span><span class="ffm-catalog-preview" aria-hidden="true">${c.shades.slice(0,6).map(s=>`<img src="${src(s.flat)}" alt="" loading="lazy">`).join('')}</span></button>`;
      }).join('');
      $('#ffm-catalog-empty').hidden=!!hits.length;
      catalog.querySelectorAll('[data-catalog-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.catalogFilter===category)));
    }
    openCatalog=(cat,opener,query='')=>{
      category=categories.includes(cat)?cat:'all';$('#ffm-catalog-search').value=query;renderCatalog();
      document.querySelectorAll('.demo-toast').forEach(t=>t.hidden=true);
      show(catalog,opener);catalog.scrollTop=0;
    };
    $('#ffm-catalog-search').addEventListener('input',renderCatalog);
    catalog.querySelectorAll('[data-catalog-filter]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.catalogFilter;renderCatalog();}));
    $('#ffm-catalog-reset').addEventListener('click',()=>{category='all';$('#ffm-catalog-search').value='';renderCatalog();$('#ffm-catalog-search').focus();});
  }
  let previousOverflow;
  const openers = new Map();
  function show(dialog, opener) {
    if(dialog.open)return;
    if(!dialogs.some(d=>d.open)) { previousOverflow = document.body.style.overflow; document.body.style.overflow='hidden'; }
    openers.set(dialog, opener || document.activeElement);
    dialog.showModal();
    dialog.querySelector('[data-ffm-close]').focus({preventScroll:true});
  }
  dialogs.forEach(dialog => {
    dialog.querySelector('[data-ffm-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const controls=[...dialog.querySelectorAll('button:not([disabled]),input,select,a[href],textarea:not([hidden])')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    dialog.addEventListener('close',()=>{
      if(!dialogs.some(d=>d.open)) document.body.style.overflow = previousOverflow || '';
      const opener=openers.get(dialog); if(opener?.isConnected)opener.focus({preventScroll:true});
    });
    dialog.addEventListener('click',e=>{
      if(e.target!==dialog)return;
      const r=dialog.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
    });
  });
  function updateCounts(){
    document.querySelectorAll('[data-sample-count]').forEach(el=>el.textContent=board.length);
    dock.setAttribute('aria-label','Мои образцы: '+board.length);
    const mine=$('.mine[data-samples]'); if(mine)mine.setAttribute('aria-label','Мои образцы: '+board.length);
    try{localStorage.setItem(storageKey,JSON.stringify(board));}catch{}
  }
  function updatePhoto(){
    const s=current.shades[index], draped=photoMode==='draped' && s.draped;
    const original=draped?s.draped:s.flat;
    $('#ffm-photo').src=window.FFM_PHOTOS?.resolve(original,assetBase) || src(original);
    $('#ffm-photo').alt=current.name+' '+s.label+(draped?' — ткань с драпировкой':' — плоский образец ткани');
    $('#ffm-photo-caption').textContent=current.name+' / '+s.label;
    detail.querySelector('[data-photo="draped"]').disabled=!s.draped;
    detail.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.photo===(draped?'draped':'flat'))));
    $('#ffm-note').textContent=(current.shades.length<current.totalShades?`В демонстрации ${current.shades.length} из ${current.totalShades} оттенков. `:'')+(s.thumbnailOnly?'В демонстрации доступна только небольшая миниатюра оттенка с цветовой стены.':!s.draped?'Плоский образец. Фотография с драпировкой этого оттенка в демонстрации отсутствует.':'');
    $('#ffm-note').hidden=!$('#ffm-note').textContent;
  }
  function updateAdd(){
    const included=board.some(x=>x.name===current.name&&x.label===current.shades[index].label);
    $('#ffm-add').textContent=included?'В подборке ✓':'Добавить образец +';
    // Keep keyboard focus on the action after adding, while suppressing duplicates.
    $('#ffm-add').setAttribute('aria-disabled',String(included));
  }
  function selectShade(i){
    index=i; updatePhoto(); updateAdd();
    $('#ffm-shade-name').textContent=current.name+' '+current.shades[index].label;
    detail.querySelectorAll('[data-ffm-shade]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.ffmShade===index)));
    $('#ffm-detail-status').textContent='';
    detail.dispatchEvent(new CustomEvent('ffm:shade-change',{detail:{name:current.name,label:current.shades[index].label}}));
  }
  function renderCollection(){
    $('#ffm-name').textContent=current.name; $('#ffm-category').textContent=current.cat;
    $('#ffm-description').textContent=current.description;
    $('#ffm-description').hidden=!current.description;
    $('#ffm-collection').value=current.name;
    $('#ffm-shade-count').textContent=current.shades.length+' оттенков';
    $('#ffm-shades').innerHTML=current.shades.map((s,i)=>`<button type="button" class="ffm-shade" data-ffm-shade="${i}" aria-label="${esc(current.name+' '+s.label)}" aria-pressed="${i===index}"><img src="${src(s.flat)}" alt="" loading="lazy"><span>${esc(s.label)}</span></button>`).join('');
    $('#ffm-specs').innerHTML=[['Состав',current.specs.composition],['Мартиндейл',current.specs.martindale],['Ширина',current.specs.width],['Плотность',current.specs.density]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'Уточнить в каталоге')}</dd></div>`).join('');
    
    selectShade(index);
    detail.querySelectorAll('[data-ffm-shade]').forEach(b=>b.addEventListener('click',()=>selectShade(+b.dataset.ffmShade)));
  }
  function open(name,label,opener){
    current=data.find(c=>c.name===name);
    if(!current||!current.shades.length)return;
    index=label?current.shades.findIndex(s=>same(s.label,label)):current.name==='Betsy'?2:0;
    const missing=index<0; if(missing)index=0;
    photoMode='draped';renderCollection();updateCounts();
    if(missing)$('#ffm-detail-status').textContent='Оттенок '+label+' не найден. Показан '+current.name+' '+current.shades[0].label+'. Выберите оттенок из палитры.';
    show(detail,opener);
  }
  function renderBoard(){
    updateCounts();
    $('#ffm-board-empty').hidden=!!board.length;
    $('#ffm-copy').disabled=!board.length;
    $('#ffm-copy-status').textContent='';$('#ffm-copy-fallback').hidden=true;
    $('#ffm-board-items').innerHTML=board.map((s,i)=>{
      const c=data.find(c=>c.name===s.name),shade=c.shades.find(x=>x.label===s.label);
      return `<li><img src="${src(shade.flat)}" alt=""><div><b>${esc(s.name)}</b><span>Оттенок ${esc(s.label)} · ${esc(c.cat)}</span></div><button type="button" data-ffm-remove="${i}" aria-label="Удалить ${esc(s.name+' '+s.label)}">×</button></li>`;
    }).join('');
    samples.querySelectorAll('[data-ffm-remove]').forEach(b=>b.addEventListener('click',()=>{
      const i=+b.dataset.ffmRemove;board.splice(i,1);renderBoard();if(current)updateAdd();
      const remaining=samples.querySelectorAll('[data-ffm-remove]');
      (remaining[Math.min(i,remaining.length-1)]||samples.querySelector('[data-ffm-close]')).focus({preventScroll:true});
      $('#ffm-copy-status').textContent='Образец удалён.';
    }));
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('[data-collection],[data-samples],[data-catalog]'); if(!a)return;
    e.preventDefault();
    if(a.hasAttribute('data-catalog')) {openCatalog?.(a.dataset.catalog,a.closest('.mobile-menu')?$('button[aria-label="Открыть меню"]'):a,a.dataset.catalogQuery||'');}
    else if(a.hasAttribute('data-samples')) {renderBoard();show(samples,a);}
    else {const tile=e.target.closest('.hstrip i');open(a.dataset.collection,tile?.querySelector('em')?.textContent||a.dataset.shade,a.closest('a.card')||a);}
  });
  $('#ffm-collection').addEventListener('change',e=>{
    current=data.find(c=>c.name===e.target.value);index=0;photoMode='draped';renderCollection();
  });
  detail.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{photoMode=b.dataset.photo;updatePhoto();}));
  $('#ffm-add').addEventListener('click',()=>{
    if($('#ffm-add').getAttribute('aria-disabled')==='true')return;
    const s=current.shades[index];board.push({name:current.name,label:s.label});updateCounts();updateAdd();
    $('#ffm-detail-status').textContent='Образец '+current.name+' '+s.label+' добавлен.';
  });
  $('#ffm-copy').addEventListener('click',async()=>{
    const text='Подборка Fabric’s:\n'+board.map(s=>s.name+' '+s.label).join('\n');
    try{await navigator.clipboard.writeText(text);$('#ffm-copy-status').textContent='Список скопирован. Его можно отправить консультанту.';}
    catch {const field=$('#ffm-copy-fallback');field.value=text;field.hidden=false;field.focus();field.select();$('#ffm-copy-status').textContent='Автоматическое копирование недоступно. Скопируйте выделенный список.';}
  });
  window.FFMSelection={open,openCatalog}; updateCounts();
  // Existing scripts create the header selection later in this same task.
  document.addEventListener('DOMContentLoaded',updateCounts);
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.card .dots,.ztx .dots').forEach(row=>{
      const card=row.closest('.card,.ztx');
      const name=card.querySelector('.nm,.zname')?.textContent;
      const collection=data.find(c=>c.name===name);if(!collection)return;
      [...row.querySelectorAll('i')].forEach((dot,i)=>{
        const label=collection.previewLabels[i];if(!label)return;
        const control=variant==='v2'?document.createElement('button'):dot;
        control.dataset.collection=name;control.dataset.shade=label;control.title=name+' '+label;
        if(variant==='v2'){
          control.type='button';control.className='ffm-home-shade';control.setAttribute('aria-label',name+' '+label);
          dot.replaceWith(control);control.append(dot);
        }
      });
    });
  });
})();

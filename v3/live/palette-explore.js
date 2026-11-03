(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const data=window.FFM_COLLECTIONS;
  const palette=JSON.parse($('#pal-data').textContent);
  const wall=$('.wall'),image=$('.wall > img'),detail=$('#ffm-detail');
  const assetBase=new URL('../../shared/',document.currentScript.src);
  const src=p=>new URL(p,assetBase).href;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const quantity=n=>`${n} ${n%10===1&&n%100!==11?'оттенок':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'оттенка':'оттенков'}`;

  // A transparent grid follows the existing image, including its horizontal scroll.
  // It never intercepts pointers or replaces the original palette/intro animation.
  const mask=document.createElement('div');
  mask.className='ffm-wall-mask';mask.hidden=true;mask.setAttribute('aria-hidden','true');
  for(const n of palette.grid.d){const cell=document.createElement('span');cell.dataset.wallShade=n;mask.append(cell);}
  wall.append(mask);
  function sizeMask(){const r=image.getBoundingClientRect();mask.style.width=r.width+'px';mask.style.height=r.height+'px';}
  new ResizeObserver(sizeMask).observe(image);image.addEventListener('load',sizeMask);sizeMask();

  const controls=document.createElement('div');controls.className='ffm-wall-tools';
  controls.innerHTML=`<div class="ffm-wall-field"><label for="ffm-wall-picker">Подсветить коллекцию на стене</label><div class="ffm-picker-control"><span id="ffm-picker-preview" aria-hidden="true"></span><input id="ffm-wall-picker" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ffm-picker-options" autocomplete="off" spellcheck="false" value="Все коллекции"><button type="button" id="ffm-picker-toggle" tabindex="-1" aria-label="Открыть список коллекций"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></button></div><div id="ffm-picker-popup" hidden><p id="ffm-picker-count" role="status"></p><div id="ffm-picker-options" role="listbox" aria-label="Коллекции тканей"></div><p id="ffm-picker-empty" hidden>Коллекцию не нашли. Попробуйте другое название.</p></div><select id="ffm-wall-collection" hidden aria-hidden="true" tabindex="-1"><option value="">Все коллекции</option>${data.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}</select></div><button type="button" id="ffm-wall-reset" disabled>Показать все</button><p id="ffm-wall-status" role="status">Выберите коллекцию — её оттенки останутся яркими.</p>`;
  $('.wall-hint').before(controls);
  const select=$('#ffm-wall-collection'),picker=$('#ffm-wall-picker'),popup=$('#ffm-picker-popup'),options=$('#ffm-picker-options');
  const entries=[{name:'',cat:'Вся палитра',shades:[data[0].shades[0],data[1].shades[2],data[6].shades[0]]},...data];
  const letters={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
  const norm=s=>[...s.toLowerCase()].map(c=>letters[c]??c).join('').replace(/y/g,'i').trim();
  let found=[],active=-1;
  function updatePicker(){
    picker.value=select.value||'Все коллекции';
    const c=entries.find(c=>c.name===select.value)||entries[0];
    const preview=$('#ffm-picker-preview');
    if(preview.dataset.collection!==c.name){preview.dataset.collection=c.name;preview.innerHTML=c.shades.slice(0,3).map(s=>`<img src="${src(s.flat)}" alt="">`).join('');}
  }
  function closePicker(){popup.hidden=true;picker.setAttribute('aria-expanded','false');picker.removeAttribute('aria-activedescendant');updatePicker();}
  function setActive(i){
    active=i;
    [...options.children].forEach((el,n)=>el.classList.toggle('ffm-picker-active',n===i));
    const el=options.children[i];
    if(el){picker.setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest',behavior:'instant'});}
    else picker.removeAttribute('aria-activedescendant');
  }
  function positionPicker(){
    const r=$('.ffm-wall-field').getBoundingClientRect(),view=window.visualViewport,viewTop=view?.offsetTop||0,below=viewTop+(view?.height||innerHeight)-r.bottom-16,above=r.top-viewTop-80;
    const up=below<230&&above>below;
    $('.ffm-wall-field').classList.toggle('ffm-picker-up',up);
    options.style.maxHeight=Math.max(110,Math.min(380,(up?above:below)-42))+'px';
  }
  function openPicker(query=''){
    window.FFMPaletteMotion?.stop();
    const q=norm(query);
    found=entries.filter(c=>norm((c.name||'Все коллекции')+' '+c.cat).includes(q));
    options.innerHTML=found.map((c,i)=>`<div id="ffm-picker-option-${i}" role="option" aria-selected="${c.name===select.value}" data-picker-name="${esc(c.name)}"><span class="ffm-picker-thumbs" aria-hidden="true">${c.shades.slice(0,3).map(s=>`<img src="${src(s.flat)}" alt="" loading="lazy">`).join('')}</span><span class="ffm-picker-description"><b>${esc(c.name||'Все коллекции')}</b><small>${esc(c.cat)}${c.name?' · '+quantity(c.shades.length):''}</small></span><span class="ffm-picker-check" aria-hidden="true">${c.name===select.value?'✓':''}</span></div>`).join('');
    $('#ffm-picker-count').textContent=q?'Найдено: '+found.length:'Поиск по коллекциям · '+data.length;
    $('#ffm-picker-empty').hidden=!!found.length;
    popup.hidden=false;picker.setAttribute('aria-expanded','true');positionPicker();
    const selected=found.findIndex(c=>c.name===select.value);setActive(selected>=0?selected:found.length?0:-1);
  }
  function choose(name){select.value=name;select.dispatchEvent(new Event('change',{bubbles:true}));closePicker();picker.focus({preventScroll:true});picker.select();}
  picker.addEventListener('focus',()=>picker.select());
  picker.addEventListener('click',()=>{if(popup.hidden){openPicker();picker.select();}});
  picker.addEventListener('input',()=>openPicker(picker.value));
  picker.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      if(popup.hidden){openPicker();return;}
      if(found.length)setActive((active+(e.key==='ArrowDown'?1:found.length-1))%found.length);
    }else if(e.key==='Enter'&&!popup.hidden){e.preventDefault();if(found[active])choose(found[active].name);}
    else if(e.key==='Escape'&&!popup.hidden){e.preventDefault();e.stopPropagation();closePicker();}
    else if(e.key==='Tab')closePicker();
    else if((e.key==='Home'||e.key==='End')&&!popup.hidden){e.preventDefault();if(found.length)setActive(e.key==='Home'?0:found.length-1);}
  });
  $('#ffm-picker-toggle').addEventListener('click',()=>{picker.focus({preventScroll:true});popup.hidden?openPicker():closePicker();});
  options.addEventListener('pointerdown',e=>e.preventDefault());
  options.addEventListener('click',e=>{const row=e.target.closest('[data-picker-name]');if(row)choose(row.dataset.pickerName);});
  document.addEventListener('pointerdown',e=>{if(!popup.hidden&&!e.target.closest('.ffm-wall-field'))closePicker();});
  addEventListener('resize',()=>{if(!popup.hidden)positionPicker();});
  window.visualViewport?.addEventListener('resize',()=>{if(!popup.hidden)positionPicker();});
  updatePicker();
  function highlight(name){
    window.FFMPaletteMotion?.stop();
    const selected=data.find(c=>c.name===name);
    select.value=selected?name:'';mask.hidden=!selected;
    updatePicker();
    $('#ffm-wall-reset').disabled=!selected;
    if(!selected){
      delete wall.dataset.highlightCollection;
      $('#ffm-wall-status').textContent='Показаны все коллекции. Выберите одну, чтобы подсветить её оттенки.';
      return;
    }
    wall.dataset.highlightCollection=name;sizeMask();
    for(const cell of mask.children)cell.classList.toggle('ffm-wall-match',palette.shades[+cell.dataset.wallShade][0]===name);
    const positions=palette.shades.map((s,n)=>s[0]===name?palette.pos.d[n]:null).filter(Boolean);
    const unique=new Set(palette.shades.filter(s=>s[0]===name).map(s=>s[1]));
    $('#ffm-wall-status').textContent=name+' · '+quantity(unique.size)+'. Остальные коллекции приглушены.';
    const firstColumn=Math.min(...positions.map(p=>p[0]));
    wall.scrollTo({left:Math.max(0,firstColumn*image.getBoundingClientRect().width/palette.walls.d.cols-48),behavior:'instant'});
  }
  select.addEventListener('change',()=>highlight(select.value));
  $('#ffm-wall-reset').addEventListener('click',()=>{highlight('');closePicker();picker.focus({preventScroll:true});});

  const jump=document.createElement('button');jump.type='button';jump.className='ffm-related-jump';
  jump.textContent='Сравнить близкие цвета ↓';jump.setAttribute('aria-controls','ffm-similar');
  $('#ffm-note').after(jump);
  const similar=document.createElement('section');similar.id='ffm-similar';similar.className='ffm-similar';similar.hidden=true;
  similar.setAttribute('aria-labelledby','ffm-similar-title');
  similar.innerHTML=`<div class="ffm-similar-heading"><div><h3 id="ffm-similar-title" tabindex="-1">Близкие цвета в других коллекциях</h3><p>Сравните фактуры и откройте понравившийся оттенок.</p></div><button type="button" id="ffm-highlight-current">Эта коллекция на стене ↗︎</button></div><p class="ffm-similar-note">Подбор по цвету фотографий. Перед заказом сверяйте ткань вживую.</p><div class="ffm-compare-layout"><div id="ffm-compare-reference"></div><div><div id="ffm-related-grid"></div><p id="ffm-related-empty" hidden></p></div></div>`;
  detail.append(similar);
  let current;
  function closest(collection,shade){
    if(!shade.lab||shade.patterned)return [];
    const best=[];
    for(const c of data){
      if(c.name===collection.name)continue;
      let nearest;
      for(const s of c.shades){
        if(!s.lab||s.patterned||s.thumbnailOnly)continue;
        const distance=Math.hypot(...s.lab.map((v,i)=>v-shade.lab[i]));
        if(!nearest||distance<nearest.distance)nearest={name:c.name,cat:c.cat,shade:s,distance};
      }
      // A limit prevents distant hues being presented as similar when a hue is rare.
      if(nearest&&nearest.distance<=12)best.push(nearest);
    }
    return best.sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name)).slice(0,6);
  }
  detail.addEventListener('ffm:shade-change',e=>{
    window.FFMPaletteMotion?.stop();
    const c=data.find(c=>c.name===e.detail.name),s=c?.shades.find(s=>s.label===e.detail.label);
    if(!s)return;
    current={collection:c,shade:s};similar.hidden=false;
    $('#ffm-compare-reference').innerHTML=`<span>Выбранный образец</span><img src="${src(s.flat)}" alt="${esc(c.name+' '+s.label)} — фактура"><b>${esc(c.name+' '+s.label)}</b><small>${esc(c.cat)}</small>`;
    const matches=closest(c,s);
    $('#ffm-related-grid').innerHTML=matches.map(m=>`<button type="button" class="ffm-related-card" data-near-name="${esc(m.name)}" data-near-shade="${esc(m.shade.label)}" aria-label="Открыть ${esc(m.name+' '+m.shade.label)}"><img src="${src(m.shade.flat)}" alt="" loading="lazy"><b>${esc(m.name+' '+m.shade.label)}</b><span>${esc(m.cat)}</span><span class="ffm-related-open">Открыть ↗︎</span></button>`).join('');
    $('#ffm-related-empty').hidden=!!matches.length;
    $('#ffm-related-empty').textContent=s.patterned?'Для выраженного рисунка подбор по одному цвету неточен. Посмотрите другие оттенки этой коллекции.':'Достаточно близких оттенков в других коллекциях в демонстрации не найдено.';
    jump.textContent='Сравнить близкие цвета ↓';
  });
  jump.addEventListener('click',()=>{
    similar.scrollIntoView({block:'start',behavior:'instant'});$('#ffm-similar-title').focus({preventScroll:true});
  });
  $('#ffm-related-grid').addEventListener('click',e=>{
    const button=e.target.closest('[data-near-name]');if(!button)return;
    window.FFMSelection.open(button.dataset.nearName,button.dataset.nearShade);
    detail.scrollTop=0;$('#ffm-shade-name').tabIndex=-1;$('#ffm-shade-name').focus({preventScroll:true});
  });
  $('#ffm-highlight-current').addEventListener('click',()=>{
    highlight(current.collection.name);
    detail.addEventListener('close',()=>{controls.scrollIntoView({block:'start',behavior:'instant'});picker.focus({preventScroll:true});},{once:true});
    detail.close();
  });
})();
